import {Getter, inject} from '@loopback/core';
import {
  Request,
  Response,
  RestBindings,
  get,
  response,
  ResponseObject,
} from '@loopback/rest';
import {Server} from 'socket.io';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import fs from 'fs-extra';
import {checkOwner, secured, SecuredType} from '../role-authentication';
import {ws} from '../websockets/decorators/websocket.decorator';
import {repository} from '@loopback/repository';
import {UserCredentials} from '../types';

/**
 * OpenAPI response for ping()
 */
const PING_RESPONSE: ResponseObject = {
  description: 'Ping Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        title: 'PingResponse',
        properties: {
          greeting: {type: 'string'},
          date: {type: 'string'},
          url: {type: 'string'},
          headers: {
            type: 'object',
            properties: {
              'Content-Type': {type: 'string'},
            },
            additionalProperties: true,
          },
        },
      },
    },
  },
};

/**
 * A simple controller to bounce back http requests
 */
export class PingController {
  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(RestBindings.Http.RESPONSE) private res: Response,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}

  // Map to `GET /ping`
  @get('/ping')
  @response(200, PING_RESPONSE)
  ping(): object {
    // Reply with a greeting, the current time, the url, and request headers
    return {
      greeting: 'Hello from LoopBack',
      date: new Date(),
      url: this.req.url,
      headers: Object.assign({}, this.req.headers),
    };
  }

  // test endpoints here

  @get('/ping/is-authenticated')
  @secured(SecuredType.IS_AUTHENTICATED)
  async testIsAuthenticated() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return {message: 'isAuthenticated: OK', user: currentUser};
  }

  @get('/ping/permit-all')
  @secured(SecuredType.PERMIT_ALL)
  testPermitAll() {
    return {message: 'permitAll: OK'};
  }

  @get('/ping/deny-all')
  @secured(SecuredType.DENY_ALL)
  testDenyAll() {
    return {message: 'denyAll: OK'};
  }

  @get('/ping/has-any-role')
  @secured(SecuredType.HAS_ANY_ROLE, ['ADMIN', 'USER'])
  testHasAnyRole() {
    return {message: 'hasAnyRole: OK'};
  }

  @get('/ping/has-roles')
  @secured(SecuredType.HAS_ROLES, ['ADMIN', 'USER'])
  testHasRoles() {
    return {message: 'hasRoles: OK'};
  }

  @get('/ping/owner')
  @secured(SecuredType.IS_AUTHENTICATED)
  async testOwner() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return {message: 'ownerRoles: OK'};
  }

  @get('/ping/socketio_test')
  socketTest() {
    this.res.set('Content-Type', 'text/html');
    const htmlStr = fs.readFileSync('d:\\work\\china\\new-ad-lib\\temp\\test.html', 'utf-8');
    this.res.send(htmlStr);
  }

  @get('/ping/websocket_emit')
  async exampleRoomEmmit(
    @ws.namespace('chats') nsp: Server
  ): Promise<any> {
    nsp.to('some room').emit('some room event', `time: ${new Date().getTime()}`);
    return 'room event emitted';
  }
}
