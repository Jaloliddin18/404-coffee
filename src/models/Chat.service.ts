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
import { GoogleGenerativeAI } from '@google/generative-ai';

class ChatService {
	private genAI: GoogleGenerativeAI;

	constructor() {
		this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
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

	/** Get all chat rooms for admin */
	public async getAllRooms(): Promise<ChatRoom[]> {
		const rooms = await ChatRoomModel.find({
			status: { $in: [ChatRoomStatus.PENDING, ChatRoomStatus.ACTIVE] },
		})
			.sort({ updatedAt: -1 })
			.exec();

		return rooms;
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

	/** Get AI response using Gemini */
	public async getAIResponse(userMessage: string): Promise<string> {
		try {
			const model = this.genAI.getGenerativeModel({
				model: 'gemini-2.5-flash',
			});

			const prompt = `You are a helpful coffee shop assistant for "404 Coffee". 
You help customers with:
- Menu questions (coffee types, prices, recommendations)
- Order inquiries
- Store hours and location information
- Coffee brewing tips and recommendations

Be friendly, helpful, and concise. If asked about something outside coffee shop topics, 
kindly redirect the conversation back to coffee-related assistance.

Customer question: ${userMessage}`;

			const result = await model.generateContent(prompt);
			const response = result.response;
			return response.text();
		} catch (error) {
			console.error('Gemini AI Error:', error);
			return "I apologize, but I'm having trouble processing your request right now. Please try again or chat with our admin for assistance.";
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
