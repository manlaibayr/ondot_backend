import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {Namespace, Socket} from 'socket.io';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import {ws} from '../websockets/decorators/websocket.decorator';
import {CONFIG} from '../config';
import {User, Verifytoken} from '../models';
import {
  ChatContactRepository,
  ChatMsgRepository,
  UserRepository,
  VerifytokenRepository,
} from '../repositories';
import {ChatMsgStatus, ChatMsgType, ChatSocketMsgType, UserType} from '../types';

const socketUserInfo: {[key: string]: any;} = {};

@ws({name: 'webrtc', namespace: '/ws/webrtc'})
export class WebrtcControllerWs {

  private chatContactId: string;
  private meUserId: string;
  private otherUserId: string;

  constructor(
    @ws.socket() private socket: Socket, // Equivalent to `@inject('ws.socket')`
    @repository(UserRepository) private userRepository: UserRepository,
    @repository(VerifytokenRepository) private verifytokenRepository: VerifytokenRepository,
    @repository(ChatMsgRepository) private chatMsgRepository: ChatMsgRepository,
    @repository(ChatContactRepository) private chatContactRepository: ChatContactRepository,
  ) {
  }

  @ws.connect()
  async connect(socket: Socket) {
    console.log('webrtc socket connected');
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
          console.log('webrtc socket auth success', user.username);
          socketUserInfo[this.socket.client.id] = user;
        } else {
          throw new Error('token is invalid');
        }
        this.chatContactId = this.socket.client.request.headers.chatcontactid;
        this.socket.join(this.chatContactId);
        const contactInfo = await this.chatContactRepository.findById(this.chatContactId);
        this.meUserId = user.id;
        this.otherUserId = contactInfo.contactUserId === user.id ? contactInfo.contactOtherUserId : contactInfo.contactUserId;
      } catch (e) {
        console.error(e);
        // this.socket.disconnect();
      }
    } else {
      console.log('JWT토큰이 정확하지 않습니다.');
      this.socket.disconnect();
    }
  }

  @ws.subscribe('CLIENT_WEBRTC_CALLER_JOIN')
  async webrtcJoin(
  ) {
  }

  @ws.subscribe('CLIENT_WEBRTC_CALLEE_JOIN')
  async webrtcCalleeJoin() {
    if (this.socket.adapter.rooms[this.chatContactId].length >= 2) {
      this.socket.emit(ChatSocketMsgType.SRV_WEBRTC_OTHER_JOIN, '');
      this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_WEBRTC_CALLEE_JOINED, this.socket.id);
    }
  }

  @ws.subscribe('CLIENT_WEBRTC_OFFER')
  async webrtcOffer(
    payload: any,
  ) {
    console.log('offer', payload);
    this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_WEBRTC_OFFER, payload);
  }

  @ws.subscribe('CLIENT_WEBRTC_ANSWER')
  async webrtcAnswer(
    payload: any,
  ) {
    console.log('answer', payload);
    this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_WEBRTC_ANSWER, payload);
  }

  @ws.subscribe('CLIENT_WEBRTC_CANDIDATE')
  async webrtcCandidate(
    incoming: any,
  ) {
    console.log('ice', incoming);
    this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_WEBRTC_CANDIDATE, incoming.candidate);
  }

  @ws.subscribe('CLIENT_WEBRTC_REJECT')
  async webrtcReject(
    payload: any,
  ) {
    console.log('answer', payload);
    this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_WEBRTC_REJECTED, payload);
  }

  @ws.subscribe('CLIENT_WEBRTC_FINISH')
  async webrtcFinish(
    payload: any,
  ) {
    console.log('answer', payload);
    await this.chatMsgRepository.create({
      chatContactId: this.chatContactId,
      senderUserId: this.otherUserId,
      receiverUserId: this.meUserId,
      msgContent: `통화시간: ${payload.time}`,
      msgType: 'text',
      msgSenderStatus: ChatMsgStatus.READ,
      msgReceiverStatus: ChatMsgStatus.READ,
    });
    this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_WEBRTC_FINISH, payload);
  }
}