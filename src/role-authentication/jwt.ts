import {
  MethodDecoratorFactory,
  inject,
  CoreBindings,
  Constructor,
  MetadataInspector,
  Provider,
  ValueOrPromise,
  Getter,
  Setter,
  BindingKey,
} from '@loopback/core';
import {
  AUTHENTICATION_METADATA_KEY,
  AuthenticationMetadata,
  AuthenticationBindings,
  AuthenticateFn,
  AuthenticationStrategy,
} from '@loopback/authentication';
import {UserProfile, securityId} from '@loopback/security';
import {StrategyAdapter} from '@loopback/authentication-passport';
import {AuthMetadataProvider} from '@loopback/authentication/dist/providers/auth-metadata.provider';
import {UserRepository, RolemappingRepository, VerifytokenRepository} from '../repositories';
import {repository} from '@loopback/repository';
import {Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import {HttpErrors, Request, RedirectRoute} from '@loopback/rest';
import {CONFIG} from '../config';
import {UserCredentials} from '../types';

export const JWT_STRATEGY_NAME = 'jwt';

// the decorator function, every required param has its own default
// so we can supply empty param when calling this decorartor.
// we will use 'secured' to match Spring Security annotation.
export function secured(
  type: SecuredType = SecuredType.IS_AUTHENTICATED, // more on this below
  roles: string[] = [],
  strategy = 'jwt',
  options?: object,
) {
  // we will use a custom interface. more on this below
  return MethodDecoratorFactory.createDecorator<MyAuthenticationMetadata>(AUTHENTICATION_METADATA_KEY, {
    type,
    roles,
    strategy,
    options,
  });
}

// enum for available secured type,
export enum SecuredType {
  IS_AUTHENTICATED, // any authenticated user
  PERMIT_ALL, // bypass security check, permit everyone
  HAS_ANY_ROLE, // user must have one or more roles specified in the `roles` attribute
  HAS_ROLES, // user mast have all roles specified in the `roles` attribute
  DENY_ALL, // you shall not pass!
}

// extended interface of the default AuthenticationMetadata which only has `strategy` and `options`
export interface MyAuthenticationMetadata extends AuthenticationMetadata {
  type: SecuredType;
  roles: string[];
}

// metadata provider for `MyAuthenticationMetadata`. Will supply method's metadata when injected
export class MyAuthMetadataProvider extends AuthMetadataProvider {
  constructor(
    @inject(CoreBindings.CONTROLLER_CLASS, {optional: true}) protected _controllerClass: Constructor<{}>,
    @inject(CoreBindings.CONTROLLER_METHOD_NAME, {optional: true}) protected _methodName: string,
  ) {
    super(_controllerClass, _methodName);
  }

  value(): MyAuthenticationMetadata[] | undefined {
    if (!this._controllerClass || !this._methodName) return;
    return MetadataInspector.getMethodMetadata<MyAuthenticationMetadata[]>(
      AUTHENTICATION_METADATA_KEY,
      this._controllerClass.prototype,
      this._methodName,
    );
  }
}

// implement custom namespace bindings
export namespace MyAuthBindings {
  export const STRATEGY = BindingKey.create<AuthenticationStrategy | undefined>('authentication.strategy');
}

// the strategy provider will parse the specifed strategy, and act accordingly
export class MyAuthAuthenticationStrategyProvider implements Provider<AuthenticationStrategy | undefined> {
  constructor(
    @inject(AuthenticationBindings.METADATA) private metadata: MyAuthenticationMetadata,
    @repository(UserRepository) private userRepository: UserRepository,
    @repository(RolemappingRepository) private rolemappingRepository: RolemappingRepository,
    @repository(VerifytokenRepository) private verifytokenRepository: VerifytokenRepository,
  ) {
  }

  value(): ValueOrPromise<AuthenticationStrategy | undefined> {
    if (!this.metadata) return;

    const {strategy} = this.metadata;
    if (strategy === JWT_STRATEGY_NAME) {
      const jwtStrategy = new JwtStrategy(
        {
          secretOrKey: CONFIG.jwtSecretKey,
          jwtFromRequest: ExtractJwt.fromExtractors([
            ExtractJwt.fromAuthHeaderAsBearerToken(),
            ExtractJwt.fromUrlQueryParameter('access_token'),
          ]),
        },
        (payload, done) => this.verifyTokenFunc(payload, done),
      );

      // we will use Loopback's  StrategyAdapter so we can leverage passport's strategy
      // and also we don't have to implement a new strategy adapter.
      return new StrategyAdapter(
        jwtStrategy,
        JWT_STRATEGY_NAME,
        // this.mapProfile.bind(this),
      );
    }
  }

  // verify JWT token and decrypt the payload.
  // Then search user from database with id equals to payload's userId.
  // if user is found, then verify its roles
  verifyTokenFunc(
    payload: UserCredentials,
    done: (err: Error | null, user?: UserProfile | false, info?: Object) => void,
  ): void {
    const {userId, username, userType, verifyToken} = payload;
    Promise.all([
      this.userRepository.findById(userId),
      this.verifytokenRepository.findOne({where: {id: verifyToken, user_id: userId, token_valid: true}}),
    ]).then(([user, verifyTokenObj]) => {
      if (!user || !verifyTokenObj) done(null, false);
      return this.verifyRoles(userId);
    }).then((result) => {
      // CURRENT_USER information structure.
      // You can add additional parameter what you call currentUser function.
      done(null, {
        userId, username, userType, verifyToken, [securityId]: username,
      });
    }).catch((err) => {
      done(null, false)
      // if (err.name === 'UnauthorizedError') done(null, false);
      // done(err, false);
    });
  }

  // verify user's role based on the SecuredType
  async verifyRoles(userId: string) {
    const {type, roles} = this.metadata;

    if ([SecuredType.IS_AUTHENTICATED, SecuredType.PERMIT_ALL].includes(type)) return;

    if (type === SecuredType.HAS_ANY_ROLE) {
      if (!roles.length) return;
      const {count} = await this.rolemappingRepository.count({
        user_id: userId,
        role_id: {inq: roles},
      });

      if (count) return;
    } else if (type === SecuredType.HAS_ROLES && roles.length) {
      const userRoles = await this.rolemappingRepository.find({where: {user_id: userId}});
      const roleIds = userRoles.map(ur => ur.role_id);
      let valid = true;
      for (const role of roles)
        if (!roleIds.includes(role)) {
          valid = false;
          break;
        }

      if (valid) return;
    }

    throw new HttpErrors.Unauthorized('Invalid authorization');
  }

  // mapProfile(user: User): UserProfile {
  //   const userProfile: UserProfile = {
  //     [securityId]: '' + user.id,
  //     profile: {
  //       ...user,
  //     },
  //   };
  //   return userProfile;
  // }
}

// the entry point for authentication.
export class MyAuthActionProvider implements Provider<AuthenticateFn> {
  constructor(
    @inject.getter(MyAuthBindings.STRATEGY) readonly getStrategy: Getter<AuthenticationStrategy>,
    @inject.setter(AuthenticationBindings.CURRENT_USER) readonly setCurrentUser: Setter<UserProfile>,
    @inject.getter(AuthenticationBindings.METADATA) readonly getMetadata: Getter<MyAuthenticationMetadata>,
    @inject.setter(AuthenticationBindings.AUTHENTICATION_REDIRECT_URL) readonly setRedirectUrl: Setter<string>,
    @inject.setter(AuthenticationBindings.AUTHENTICATION_REDIRECT_STATUS) readonly setRedirectStatus: Setter<number>,
  ) {
  }

  value(): AuthenticateFn {
    return request => this.action(request);
  }

  async action(request: Request): Promise<UserProfile | undefined> {
    try {
      const strategy = await this.getStrategy();
      if (!strategy) return;

      const authResponse = await strategy.authenticate(request);
      let userProfile: UserProfile;

      // response from `strategy.authenticate()` could return an object of type UserProfile or RedirectRoute
      if (RedirectRoute.isRedirectRoute(authResponse)) {
        const redirectOptions = authResponse;
        // bind redirection url and status to the context
        // controller should handle actual redirection
        this.setRedirectUrl(redirectOptions.targetLocation);
        this.setRedirectStatus(redirectOptions.statusCode);
      } else if (authResponse) {
        // if `strategy.authenticate()` returns an object of type UserProfile, set it as current user
        userProfile = authResponse as UserProfile;
        this.setCurrentUser(userProfile);
        return userProfile;
      } else if (!authResponse) {
        // important to throw a non-protocol-specific error here
        const error = new Error(
          `User profile not returned from strategy's authenticate function`,
        );
        Object.assign(error, {
          code: 'USER_PROFILE_NOT_FOUND',
        });
        throw error;
      }
    } catch (e) {
      const metadata = await this.getMetadata();
      if (metadata && metadata.type === SecuredType.PERMIT_ALL) return;
      throw e;
    }
  }
}
