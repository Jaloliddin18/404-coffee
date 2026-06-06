import { ObjectId } from 'mongoose';
import ChatRoomModel from '../schema/ChatRoom.model';
import MessageModel from '../schema/Message.model';
import { ChatRoomStatus, MessageSenderType } from '../libs/enums/chat.enum';
import {
	ChatRoom,
	ChatRoomInput,
	Message,
	MessageInput,
} from '../libs/types/chat';
import Groq from 'groq-sdk';

class ChatService {
	private groq: Groq;

	constructor() {
		this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
	}

	/** Create or get existing chat room for a user */
	public async getOrCreateRoom(input: ChatRoomInput): Promise<ChatRoom> {
		// Check for existing active/pending room
		let room = await ChatRoomModel.findOne({
			memberId: input.memberId,
			status: { $in: [ChatRoomStatus.PENDING, ChatRoomStatus.ACTIVE] },
		}).exec();

		if (!room) {
			room = await ChatRoomModel.create({
				memberId: input.memberId,
				memberNick: input.memberNick,
				status: ChatRoomStatus.PENDING,
			});
		}

		return room;
	}

	/** Get all chat rooms for admin (only rooms with at least one message) */
	public async getAllRooms(): Promise<ChatRoom[]> {
		const rooms = await ChatRoomModel.find({
			status: { $in: [ChatRoomStatus.PENDING, ChatRoomStatus.ACTIVE] },
		})
			.sort({ updatedAt: -1 })
			.exec();

		// Filter out rooms that have no messages (user opened chat but didn't send anything)
		const roomsWithMessages = await Promise.all(
			rooms.map(async (room: any) => {
				const messageCount = await MessageModel.countDocuments({
					roomId: room._id,
				}).exec();
				return messageCount > 0 ? room : null;
			}),
		);

		return roomsWithMessages.filter((room) => room !== null) as ChatRoom[];
	}

	/** Get unread message count for a room (messages from USER that are not seen) */
	public async getUnreadCount(roomId: ObjectId): Promise<number> {
		const count = await MessageModel.countDocuments({
			roomId,
			senderType: 'USER',
			seen: false,
		}).exec();
		return count;
	}

	/** Get all rooms with their unread counts */
	public async getAllRoomsWithUnreadCounts(): Promise<
		Array<ChatRoom & { unreadCount: number }>
	> {
		const rooms = await this.getAllRooms();
		const roomsWithCounts = await Promise.all(
			rooms.map(async (room: any) => {
				const unreadCount = await this.getUnreadCount(room._id);
				const roomData = room.toObject ? room.toObject() : room;
				return { ...roomData, unreadCount };
			}),
		);
		return roomsWithCounts;
	}

	/** Get chat room by ID */
	public async getRoomById(roomId: ObjectId): Promise<ChatRoom | null> {
		const room = await ChatRoomModel.findById(roomId).exec();
		return room;
	}

	/** Update room status */
	public async updateRoomStatus(
		roomId: ObjectId,
		status: ChatRoomStatus,
		adminId?: ObjectId,
	): Promise<ChatRoom | null> {
		const updateData: any = { status };
		if (adminId) updateData.adminId = adminId;

		const room = await ChatRoomModel.findByIdAndUpdate(roomId, updateData, {
			new: true,
		}).exec();

		return room;
	}

	/** Get messages for a room */
	public async getMessages(roomId: ObjectId): Promise<Message[]> {
		const messages = await MessageModel.find({ roomId })
			.sort({ createdAt: 1 })
			.exec();

		return messages;
	}

	/** Save a message */
	public async saveMessage(input: MessageInput): Promise<Message> {
		const message = await MessageModel.create(input);

		// Update last message in room
		await ChatRoomModel.findByIdAndUpdate(input.roomId, {
			lastMessage: input.content.substring(0, 100),
		}).exec();

		return message;
	}

	/** Mark messages as seen */
	public async markMessagesAsSeen(
		roomId: ObjectId,
		viewerType: string,
	): Promise<void> {
		const senderTypeToMark = viewerType === 'ADMIN' ? 'USER' : 'ADMIN';
		const seenAt = new Date();

		await MessageModel.updateMany(
			{
				roomId,
				senderType: senderTypeToMark,
				seen: false,
			},
			{
				seen: true,
				seenAt,
			},
		).exec();
	}

	public async getAIResponse(userMessage: string): Promise<string> {
		try {
			const completion = await this.groq.chat.completions.create({
				messages: [
					{
						role: 'system',
						content: 'You are a helpful coffee shop assistant for "404 Coffee". Help customers with menu questions, orders, store hours, and coffee recommendations. Be friendly and concise.'
					},
					{
						role: 'user',
						content: userMessage
					}
				],
				model: 'llama3-8b-8192',
			});
			return completion.choices[0]?.message?.content || "Sorry, I couldn't process your request.";
		} catch (error) {
			console.error('Groq AI Error:', error);
			return "I'm having trouble right now. Please try again or chat with our admin.";
		}
	}

	/** Close a chat room */
	public async closeRoom(roomId: ObjectId): Promise<ChatRoom | null> {
		const room = await ChatRoomModel.findByIdAndUpdate(
			roomId,
			{ status: ChatRoomStatus.CLOSED },
			{ new: true },
		).exec();

		return room;
	}

	/** Update member status in all their chat rooms (used when user status changes) */
	public async updateMemberStatusInRooms(
		memberId: ObjectId,
		memberStatus: string,
	): Promise<number> {
		const result = await ChatRoomModel.updateMany(
			{ memberId },
			{ memberStatus },
		).exec();

		return result.modifiedCount;
	}
}

export default ChatService;
