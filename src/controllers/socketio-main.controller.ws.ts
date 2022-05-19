import {Socket} from 'socket.io';
import jwt from 'jsonwebtoken';
import {ws} from '../websockets/decorators/websocket.decorator';
import {CONFIG} from '../config';
import {repository} from '@loopback/repository';
import {User, Verifytoken} from '../models';
import {UserRepository, VerifytokenRepository} from '../repositories';
import {UserType} from '../types';



const socketUserInfo: {[key: string]: any;} = {};

/**
 * A demo controller for websocket
 */
// @ws({name: 'group', namespace: /^\/group\/[\da-z\-]+$/})
@ws({name: 'main', namespace: '/ws/main'})
export class MainSocketControllerWs {
  private groupId: string;  // same with live id
  private currentUser: User | undefined;

  constructor(
    @ws.socket() private socket: Socket, // Equivalent to `@inject('ws.socket')`
    @repository(UserRepository) private userRepository: UserRepository,
    @repository(VerifytokenRepository) private verifytokenRepository: VerifytokenRepository,
  ) {
  }

  /**
   * The method is invoked when a client connects to the server
   * @param socket
   */
  @ws.connect()
  async connect(socket: Socket) {
    console.log('main socket connected');
    // jwtToken header
    const jwtTokenHeader = this.socket.client.request.headers.authorization;
    if (jwtTokenHeader && jwtTokenHeader.indexOf('Bearer ') === 0) {
      const jwtToken: string = jwtTokenHeader.substring('Bearer '.length);
      try {
        const tokenObject: any = jwt.verify(jwtToken, CONFIG.jwtSecretKey);
        const user: User = await this.userRepository.findById(tokenObject.userId);
        const verifyTokenObj: Verifytoken | null = await this.verifytokenRepository.findOne({
          where: {id: tokenObject.verifyToken, user_id: tokenObject.userId, token_valid: true},
        });
        if (user && verifyTokenObj && user.userType === UserType.USER) {
          console.log('main socket auth success', user.username);
          this.currentUser = user;
          socketUserInfo[this.socket.client.id] = user;
        } else {
          throw new Error('token is invalid');
        }
        socket.join(user.id);
      } catch (e) {
        console.log(e);
        // this.socket.disconnect();
      }
    } else {
      console.log('JWT토큰이 정확하지 않습니다.');
      // this.socket.disconnect();
    }
  }



  /**
   * Register a handler for all events
   * @param msg
   */
  // @ws.subscribe(/.+/)
  // logMessage(...args: unknown[]) {
  //   console.log('Message: %s', args);
  // }

  /**
   * The method is invoked when a client disconnects from the server
   * @param socket
   */
  @ws.disconnect()
  disconnect() {
    console.log('Client disconnected: %s', this.socket.id);
    if (socketUserInfo[this.socket.client.id]) delete socketUserInfo[this.socket.client.id];
    this.socket.leave(this.groupId);
  }
}