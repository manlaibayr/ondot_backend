import {BootMixin} from '@loopback/boot';
import {ApplicationConfig, createBindingFromClass} from '@loopback/core';
import { RestExplorerBindings, RestExplorerComponent} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {ServiceMixin} from '@loopback/service-proxy';
import {AuthenticationBindings} from '@loopback/authentication';
import path from 'path';
import {MySequence} from './sequence';
import {MyAuthMetadataProvider, MyAuthAuthenticationStrategyProvider, MyAuthActionProvider, MyAuthBindings} from './role-authentication';
import {RestBindings} from '@loopback/rest';
import { WebsocketApplication } from "./websockets/websocket.application";
import { WebsocketControllerBooter } from "./websockets/websocket.booter";
import {initCronJob} from './services/cronJob';

export {ApplicationConfig};

export class PowerApiApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(WebsocketApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));
    this.static('/upload', path.join(__dirname, '../upload'));

    this.addSecuritySpec();

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    // start cronjob
    initCronJob(this);

    // Set up authentication
    this.bind(AuthenticationBindings.METADATA).toProvider(MyAuthMetadataProvider);
    this.bind(MyAuthBindings.STRATEGY).toProvider(MyAuthAuthenticationStrategyProvider);
    this.bind(AuthenticationBindings.AUTH_ACTION).toProvider(MyAuthActionProvider);
    this.bind(RestBindings.REQUEST_BODY_PARSER_OPTIONS).to({
      limit: '50MB',
    });

    // Set up Socket.io
    this.booters(WebsocketControllerBooter);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      }
    };
  }

  // Add JWT token setting in Api explorer
  addSecuritySpec(): void {
    this.api({
      openapi: '3.0.0',
      info: {
        title: 'Ondot Api',
        version: require('.././package.json').version,
      },
      paths: {},
      components: {
        securitySchemes: {
          jwt: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          jwt: [],
        },
      ],
      servers: [{url: '/'}],
    });
  }
}
