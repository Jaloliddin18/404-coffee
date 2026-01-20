import { ObjectId } from 'mongoose';
import { ChatRoomStatus, MessageSenderType } from '../enums/chat.enum';
import { MemberStatus } from '../enums/member.enum';

export interface ChatRoom {
	_id: ObjectId;
	memberId: ObjectId;
	adminId?: ObjectId;
	memberNick: string;
	memberStatus: MemberStatus;
	status: ChatRoomStatus;
	lastMessage?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ChatRoomInput {
	memberId: ObjectId;
	memberNick: string;
}

export interface Message {
	_id: ObjectId;
	roomId: ObjectId;
	senderId: ObjectId;
	senderType: MessageSenderType;
	senderNick: string;
	content: string;
	createdAt: Date;
}

export interface MessageInput {
	roomId: ObjectId;
	senderId: ObjectId;
	senderType: MessageSenderType;
	senderNick: string;
	content: string;
}

export interface AIMessageInput {
	message: string;
	memberId?: ObjectId;
}
