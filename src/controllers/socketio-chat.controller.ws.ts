import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {Namespace, Socket} from 'socket.io';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import {ws} from '../websockets/decorators/websocket.decorator';
import {CONFIG} from '../config';
import {User, Verifytoken} from '../models';
import {
  BlockUserRepository,
  ChatContactRepository,
  ChatGroupMsgRepository,
  ChatMsgRepository,
  HobbyProfileRepository,
  HobbyRoomMemberRepository,
  HobbyRoomRepository,
  MeetingProfileRepository,
  UserRepository,
  VerifytokenRepository,
} from '../repositories';
import {ChatMsgStatus, ChatMsgType, ChatSocketMsgType, ChatType, ContactStatus, MainSocketMsgType, RoomMemberJoinType, ServiceType, UserType} from '../types';

const socketUserInfo: {[key: string]: any;} = {};

/**
 * A demo controller for websocket
 */
// @ws({name: 'group', namespace: /^\/group\/[\da-z\-]+$/})
@ws({name: 'chat', namespace: '/ws/chat'})
export class ChatControllerWs {
  private chatContactId: string;  // same with live id
  private chatType: ChatType;
  private meInfo: {id: string, nickname?: string, profile?: string};
  private otherInfo: {id: string, nickname?: string, profile?: string, isBlock?: boolean};
  private otherDeleted: boolean;

  constructor(
    @ws.socket() private socket: Socket, // Equivalent to `@inject('ws.socket')`
    @repository(UserRepository) private userRepository: UserRepository,
    @repository(VerifytokenRepository) private verifytokenRepository: VerifytokenRepository,
    @repository(ChatContactRepository) private chatContactRepository: ChatContactRepository,
    @repository(ChatMsgRepository) private chatMsgRepository: ChatMsgRepository,
    @repository(MeetingProfileRepository) private meetingProfileRepository: MeetingProfileRepository,
    @repository(BlockUserRepository) private blockUserRepository: BlockUserRepository,
    @repository(HobbyProfileRepository) private hobbyProfileRepository: HobbyProfileRepository,
    @repository(ChatGroupMsgRepository) private chatGroupMsgRepository: ChatGroupMsgRepository,
    @repository(HobbyRoomMemberRepository) private hobbyRoomMemberRepository: HobbyRoomMemberRepository,
    @repository(HobbyRoomRepository) private hobbyRoomRepository: HobbyRoomRepository,
  ) {
  }

  async getContactInfo(userId: string, chatType: ChatType) {
    const contactInfo = await this.chatContactRepository.findById(this.chatContactId);
    const otherUserId = contactInfo.contactUserId === userId ? contactInfo.contactOtherUserId : contactInfo.contactUserId;
    if (chatType === ChatType.MEETING_CHAT) {
      const [meProfile, otherProfile] = await Promise.all([
        this.meetingProfileRepository.findOne({where: {userId: userId}}),
        this.meetingProfileRepository.findOne({where: {userId: otherUserId}}),
      ]);
      if (!meProfile || !otherProfile) throw new HttpErrors.BadRequest('회원정보가 정확하지 않습니다.');
      const otherBlock = await this.blockUserRepository.findOne({where: {blockUserId: userId, blockOtherUserId: otherUserId, blockServiceType: ServiceType.MEETING}});
      const meBlock = await this.blockUserRepository.findOne({where: {blockUserId: otherUserId, blockOtherUserId: userId, blockServiceType: ServiceType.MEETING}});
      const meInfo = {id: meProfile.userId, profile: meProfile.meetingPhotoMain, nickname: meProfile.meetingNickname};
      const otherInfo = {id: otherProfile?.userId, profile: otherProfile?.meetingPhotoMain, nickname: otherProfile?.meetingNickname, isBlock: !!otherBlock};
      return {
        meProfile: meInfo,
        otherProfile: otherInfo,
        waitAllowRequest: contactInfo.contactOtherUserId === userId && contactInfo.contactStatus === ContactStatus.REQUEST,
        otherDeleted: !!meBlock || (contactInfo.contactUserId === userId ? (contactInfo.contactOtherStatus === ContactStatus.DELETE) : (contactInfo.contactStatus === ContactStatus.DELETE)),
      };
    } else if (chatType === ChatType.HOBBY_CHAT) {
      const [meProfile, otherProfile] = await Promise.all([
        this.hobbyProfileRepository.findOne({where: {userId: userId}}),
        this.hobbyProfileRepository.findOne({where: {userId: otherUserId}}),
      ]);
      if (!meProfile || !otherProfile) throw new HttpErrors.BadRequest('회원정보가 정확하지 않습니다.');
      const otherBlock = await this.blockUserRepository.findOne({where: {blockUserId: userId, blockOtherUserId: otherUserId, blockServiceType: ServiceType.HOBBY}});
      const meBlock = await this.blockUserRepository.findOne({where: {blockUserId: otherUserId, blockOtherUserId: userId, blockServiceType: ServiceType.HOBBY}});
      const meInfo = {id: meProfile.userId, profile: meProfile.hobbyPhoto, nickname: meProfile.hobbyNickname};
      const otherInfo = {id: otherProfile?.userId, profile: otherProfile?.hobbyPhoto, nickname: otherProfile?.hobbyNickname, isBlock: !!otherBlock};
      return {
        meProfile: meInfo,
        otherProfile: otherInfo,
        waitAllowRequest: contactInfo.contactOtherUserId === userId && contactInfo.contactStatus === ContactStatus.REQUEST,
        otherDeleted: !!meBlock || (contactInfo.contactUserId === userId ? (contactInfo.contactOtherStatus === ContactStatus.DELETE) : (contactInfo.contactStatus === ContactStatus.DELETE)),
      };
    } else {
      throw new HttpErrors.BadRequest('잘못된 채팅입니다.');
    }
  }

  /**
   * The method is invoked when a client connects to the server
   * @param socket
   */
  @ws.connect()
  async connect(socket: Socket) {
    console.log('chat socket connected');
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
          console.log('chat socket auth success', user.username);
          socketUserInfo[this.socket.client.id] = user;
        } else {
          throw new Error('token is invalid');
        }

        // send previous message and info;
        let result: any;
        this.chatContactId = this.socket.client.request.headers.chatcontactid;
        this.chatType = this.socket.client.request.headers.chattype;
        this.socket.join(this.chatContactId);
        this.socket.join(tokenObject.userId);
        if (this.chatType !== ChatType.HOBBY_ROOM_CHAT) {
          const contactInfo = await this.getContactInfo(user.id, this.chatType);
          const previousChatList = await this.chatMsgRepository.find({where: {chatContactId: this.chatContactId}, order: ['createdAt asc']});
          this.meInfo = contactInfo.meProfile;
          this.otherInfo = contactInfo.otherProfile;
          this.otherDeleted = contactInfo.otherDeleted;
          let lastTime: any;
          const previousChat = previousChatList.map((v) => {
            const renderTime = (!lastTime || !moment(lastTime).isSame(v.createdAt, 'day'));
            lastTime = v.createdAt;
            return {
              id: v.id,
              type: v.msgType,
              content: (v.msgType === ChatMsgType.TEXT || v.msgType === ChatMsgType.SYSTEM) ? v.msgContent : JSON.parse(v.msgContent ?? '{}'),
              targetId: v.senderUserId,
              chatInfo: {
                avatar: this.otherInfo.profile,
                id: this.otherInfo.id,
                nickName: this.otherInfo.nickname,
              },
              renderTime,
              sendStatus: 1,
              time: moment(v.createdAt).unix() * 1000,
            };
          });
          result = {
            ...contactInfo,
            previousChat,
          };
          // 이전의 채팅모두 읽음으로 표시
          await this.chatMsgRepository.updateAll({msgReceiverStatus: ChatMsgStatus.READ}, {chatContactId: this.chatContactId, receiverUserId: this.meInfo.id});
        } else {
          const hobbyProfile = await this.hobbyProfileRepository.findOne({where: {userId: user.id}});
          if (!hobbyProfile) throw new HttpErrors.BadRequest('회원정보가 정확하지 않습니다.');
          const roomMemberInfo = await this.hobbyRoomMemberRepository.findOne({
            where: {
              roomId: this.chatContactId,
              memberUserId: verifyTokenObj.user_id,
              memberJoinStatus: {neq: RoomMemberJoinType.KICK},
            },
          });
          if (!roomMemberInfo) throw new HttpErrors.BadRequest('모임방에 가입하지 않아 채팅을 할수 없습니다.');
          this.meInfo = {id: hobbyProfile.userId, profile: hobbyProfile.hobbyPhoto, nickname: hobbyProfile.hobbyNickname};
          const previousChatList = await this.chatGroupMsgRepository.find({where: {groupRoomId: this.chatContactId}, include: [{relation: 'hobbyProfile'}], order: ['createdAt asc']});
          let lastTime: any;
          const previousChat: any[] = previousChatList.map((v) => {
            const renderTime = (!lastTime || !moment(lastTime).isSame(v.createdAt, 'day'));
            lastTime = v.createdAt;
            return {
              id: v.id,
              type: v.groupMsgType,
              content: (v.groupMsgType === ChatMsgType.TEXT || v.groupMsgType === ChatMsgType.SYSTEM) ? v.groupMsgContent : JSON.parse(v.groupMsgContent ?? '{}'),
              targetId: v.groupSenderUserId,
              chatInfo: {
                avatar: v.hobbyProfile?.hobbyPhoto,
                id: v.groupSenderUserId,
                nickName: v.hobbyProfile?.hobbyNickname,
              },
              renderTime,
              sendStatus: 1,
              time: moment(v.createdAt).unix() * 1000,
            };
          });
          const hobbyRoomInfo = await this.hobbyRoomRepository.findById(this.chatContactId);
          result = {meProfile: {...this.meInfo, isRoomAdmin: this.meInfo.id === hobbyRoomInfo.userId}, previousChat, isRoomDelete: hobbyRoomInfo.isRoomDelete};
        }
        this.socket.emit(ChatSocketMsgType.SRV_PREVIOUS_CHAT_LIST, result);
      } catch (e) {
        console.error(e);
        // this.socket.disconnect();
      }
    } else {
      console.log('JWT토큰이 정확하지 않습니다.');
      this.socket.disconnect();
    }
  }

  @ws.subscribe('CLIENT_CONTACT_INFO')
  async getOtherInfo(
    chatMsg: any,
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const contactInfo = await this.getContactInfo(this.meInfo.id, this.chatType);
    this.meInfo = contactInfo.meProfile;
    this.otherInfo = contactInfo.otherProfile;
    this.otherDeleted = contactInfo.otherDeleted;
    this.socket.emit(ChatSocketMsgType.SRV_CONTACT_INFO, contactInfo);
    const otherContactInfo = await this.getContactInfo(this.otherInfo.id, this.chatType);
    this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_CONTACT_INFO, otherContactInfo);
  }

  @ws.subscribe('CLIENT_SEND_MSG')
  async sendChatMsg(
    chatMsg: any,
    @ws.namespace('main') nspMain: Namespace,
  ) {
    let sendMsgObj: any, pushMsgObj: any;
    if (this.chatType !== ChatType.HOBBY_ROOM_CHAT) {
      const chatInfo = await this.chatMsgRepository.create({
        chatContactId: this.chatContactId,
        senderUserId: this.meInfo.id,
        receiverUserId: this.otherInfo.id,
        msgContent: chatMsg.type === ChatMsgType.TEXT ? chatMsg.content : JSON.stringify(chatMsg.content),
        msgType: chatMsg.type,
        msgSenderStatus: ChatMsgStatus.READ,
        msgReceiverStatus: this.socket.adapter.rooms[this.chatContactId].length > 1 ? ChatMsgStatus.READ : ChatMsgStatus.UNREAD,
      });
      sendMsgObj = {
        id: chatInfo.id,
        type: chatMsg.type,
        content: chatMsg.content,
        targetId: chatInfo.senderUserId,
        chatInfo: {
          avatar: this.meInfo.profile,
          id: this.meInfo.id,
          nickName: this.meInfo.nickname,
        },
        // renderTime: true,
        sendStatus: 1,
        time: moment(chatInfo.createdAt).unix() * 1000,
      };
      pushMsgObj = {chatContactId: this.chatContactId, nickname: this.meInfo.nickname, msg: (chatMsg.type === ChatMsgType.TEXT ? chatMsg.content : chatMsg.type), profile: this.meInfo.profile};
    } else {
      const msgInfo = await this.chatGroupMsgRepository.create({
        groupRoomId: this.chatContactId,
        groupSenderUserId: this.meInfo.id,
        groupMsgContent: chatMsg.type === ChatMsgType.TEXT ? chatMsg.content : JSON.stringify(chatMsg.content),
        groupMsgType: chatMsg.type,
      });
      sendMsgObj = {
        id: msgInfo.id,
        type: chatMsg.type,
        content: chatMsg.content,
        targetId: msgInfo.groupSenderUserId,
        chatInfo: {
          avatar: this.meInfo.profile,
          id: this.meInfo.id,
          nickName: this.meInfo.nickname,
        },
        // renderTime: true,
        sendStatus: 1,
        time: moment(msgInfo.createdAt).unix() * 1000,
      };
      pushMsgObj = {chatContactId: this.chatContactId, nickname: this.meInfo.nickname, msg: (chatMsg.type === ChatMsgType.TEXT ? chatMsg.content : chatMsg.type), profile: this.meInfo.profile};
    }

    if (this.chatType !== ChatType.HOBBY_ROOM_CHAT) {
      const blockUserInfo = await this.blockUserRepository.findOne({where: {blockUserId: this.otherInfo.id, blockOtherUserId: this.meInfo.id, blockServiceType: ServiceType.MEETING}});
      if (!this.otherDeleted && !blockUserInfo) {
        if (this.socket.adapter.rooms[this.chatContactId].length < 2) {
          nspMain.to(this.otherInfo.id).emit(MainSocketMsgType.SRV_OTHER_USER_CHAT, pushMsgObj);
        }
        this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_RECEIVE_MSG, sendMsgObj);
      }
    } else {
      this.socket.to(this.chatContactId).emit(ChatSocketMsgType.SRV_RECEIVE_MSG, sendMsgObj);
    }
  }

  @ws.subscribe('CLIENT_VOICE_CALL')
  async voiceCall(
    data: any,
    @ws.namespace('main') nspMain: Namespace,
  ) {
    nspMain.to(this.otherInfo.id).emit(MainSocketMsgType.SRV_OTHER_VOICE_REQ, {
      chatContactId: this.chatContactId,
      profile: {
        profile: this.meInfo.profile,
        id: this.meInfo.id,
        nickname: this.meInfo.nickname,
      },
    });
  }


  /**
   * The method is invoked when a client disconnects from the server
   * @param socket
   */
  @ws.disconnect()
  disconnect() {
    console.log('Client disconnected: %s', this.socket.id);
    if (socketUserInfo[this.socket.client.id]) delete socketUserInfo[this.socket.client.id];
    this.socket.leave(this.chatContactId);
  }
}