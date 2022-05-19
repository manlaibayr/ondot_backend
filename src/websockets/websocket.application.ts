// https://github.com/alexkander/loopback4-example-websocket-app

import { ApplicationConfig } from '@loopback/core';
import { RestApplication } from '@loopback/rest';
import { WebSocketServer } from "./websocket.server";
import { Constructor } from "@loopback/context";
import { Namespace } from "socket.io";

export { ApplicationConfig };

export class WebsocketApplication extends RestApplication {
  readonly wsServer: WebSocketServer;

  constructor(options: ApplicationConfig = {}) {
    super(options);
    this.wsServer = new WebSocketServer(this);
  }

  public websocketRoute(controllerClass: Constructor<any>, namespace?: string | RegExp): Namespace {
    return this.wsServer.route(controllerClass, namespace) as Namespace;
  }

  public async start(): Promise<void> {
    await super.start();
    await this.wsServer.start(this.restServer.httpServer);
  }

  public async stop(): Promise<void> {
    await this.wsServer.stop();
    await super.stop();
  }
}
