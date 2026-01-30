import { Server, Socket } from 'socket.io';
import ChatService from '../models/Chat.service';
import { ChatRoomStatus, MessageSenderType } from './enums/chat.enum';
import { shapeIntoMongooseObjectId } from './config';

const chatService = new ChatService();

// Track connected users and admins
const connectedUsers = new Map<string, string>(); // memberId -> socketId
const connectedAdmins = new Map<string, string>(); // adminId -> socketId
const adminActiveRooms = new Map<string, string | null>(); // adminId -> currently viewed roomId
const adminLastSeen = new Map<string, Date>(); // adminId -> last seen time
let ioInstance: Server;

export function initializeSocket(io: Server): void {
	ioInstance = io;
	io.on('connection', (socket: Socket) => {
		console.log('New socket connection:', socket.id);

		// User joins their chat room
		socket.on(
			'user:join',
			async (data: { memberId: string; memberNick: string }) => {
				try {
					const { memberId, memberNick } = data;
					connectedUsers.set(memberId, socket.id);

					// Get or create room for user
					const room = await chatService.getOrCreateRoom({
						memberId: shapeIntoMongooseObjectId(memberId),
						memberNick,
					});

					// Use toString() to ensure consistent room name format
					const roomIdStr = room._id.toString();
					socket.join(`room:${roomIdStr}`);
					socket.emit('room:joined', { room });

					// Get existing messages
					const messages = await chatService.getMessages(room._id);
					socket.emit('messages:history', { messages });

					// Note: Admin is NOT notified here - chat will appear to admin only when user sends first message

					console.log(`User ${memberNick} joined room:${roomIdStr}`);
				} catch (error) {
					console.error('Error in user:join:', error);
					socket.emit('error', { message: 'Failed to join chat room' });
				}
			},
		);

		// Admin joins to manage chats
		socket.on('admin:join', async (data: { adminId: string }) => {
			try {
				const { adminId } = data;
				connectedAdmins.set(adminId, socket.id);
				adminActiveRooms.set(adminId, null);
				adminLastSeen.set(adminId, new Date());
				socket.join('admin-room');

				// Get all active chat rooms with unread counts
				const rooms = await chatService.getAllRoomsWithUnreadCounts();
				socket.emit('admin:rooms', { rooms });

				// Broadcast admin online status to all users
				io.emit('admin:status', {
					isOnline: connectedAdmins.size > 0,
					adminCount: connectedAdmins.size,
					lastSeen: new Date(),
				});

				console.log(`Admin ${adminId} connected`);
			} catch (error) {
				console.error('Error in admin:join:', error);
				socket.emit('error', { message: 'Failed to join admin room' });
			}
		});

		// Admin accepts a chat
		socket.on(
			'admin:accept-chat',
			async (data: { roomId: string; adminId: string }) => {
				try {
					const { roomId, adminId } = data;

					const room = await chatService.updateRoomStatus(
						shapeIntoMongooseObjectId(roomId),
						ChatRoomStatus.ACTIVE,
						shapeIntoMongooseObjectId(adminId),
					);

					if (room) {
						// Use room._id from database for consistent room naming
						const roomIdStr = room._id.toString();
						socket.join(`room:${roomIdStr}`);
						io.to(`room:${roomIdStr}`).emit('room:status-updated', { room });

						// Mark user messages as seen by admin
						await chatService.markMessagesAsSeen(
							shapeIntoMongooseObjectId(roomId),
							'ADMIN',
						);

						// Get messages for this room (with updated seen status)
						const messages = await chatService.getMessages(room._id);
						socket.emit('messages:history', { messages });

						// Notify user that their messages were seen
						io.to(`room:${roomIdStr}`).emit('messages:seen', {
							roomId: roomIdStr,
							seenBy: 'ADMIN',
							seenAt: new Date(),
						});
					}

					console.log(`Admin ${adminId} accepted chat ${roomId}`);
				} catch (error) {
					console.error('Error in admin:accept-chat:', error);
					socket.emit('error', { message: 'Failed to accept chat' });
				}
			},
		);

		// Send message (user or admin)
		socket.on(
			'message:send',
			async (data: {
				roomId: string;
				senderId: string;
				senderType: MessageSenderType;
				senderNick: string;
				content: string;
			}) => {
				try {
					const { roomId, senderId, senderType, senderNick, content } = data;

					// Check if room is still active before saving message
					const room = await chatService.getRoomById(
						shapeIntoMongooseObjectId(roomId),
					);
					if (!room || room.status === ChatRoomStatus.CLOSED) {
						socket.emit('room:closed', {
							room,
							message:
								'This chat has been closed. Please start a new conversation.',
						});
						return;
					}

					const message = await chatService.saveMessage({
						roomId: shapeIntoMongooseObjectId(roomId),
						senderId: shapeIntoMongooseObjectId(senderId),
						senderType,
						senderNick,
						content,
					});

					// Broadcast message to room - use room._id for consistent naming
					const roomIdStr = room._id.toString();
					io.to(`room:${roomIdStr}`).emit('message:receive', { message });

					// Get updated unread count for this room
					const unreadCount = await chatService.getUnreadCount(
						shapeIntoMongooseObjectId(roomId),
					);

					// If this is the first message from a user (room was PENDING), notify admins about new chat
					if (
						room.status === ChatRoomStatus.PENDING &&
						senderType === MessageSenderType.USER
					) {
						const roomData = (room as any).toObject
							? (room as any).toObject()
							: room;
						const roomWithUnread = { ...roomData, unreadCount };
						io.to('admin-room').emit('admin:new-chat', {
							room: roomWithUnread,
						});
					}

					// Also update admin list with unread count
					io.to('admin-room').emit('admin:message-received', {
						roomId: roomIdStr,
						message,
						unreadCount,
					});

					console.log(`Message sent in room:${roomIdStr} by ${senderNick}`);
				} catch (error) {
					console.error('Error in message:send:', error);
					socket.emit('error', { message: 'Failed to send message' });
				}
			},
		);

		// Mark messages as seen
		socket.on(
			'message:mark-seen',
			async (data: { roomId: string; viewerType: string }) => {
				try {
					const { roomId, viewerType } = data;

					await chatService.markMessagesAsSeen(
						shapeIntoMongooseObjectId(roomId),
						viewerType,
					);

					// Notify the other party that their messages were seen
					// Use the same roomId format that was used when joining
					io.to(`room:${roomId}`).emit('messages:seen', {
						roomId,
						seenBy: viewerType,
						seenAt: new Date(),
					});

					console.log(
						`Messages in room:${roomId} marked as seen by ${viewerType}`,
					);
				} catch (error) {
					console.error('Error in message:mark-seen:', error);
				}
			},
		);

		// AI Chat message
		socket.on(
			'ai:chat',
			async (data: { message: string; memberId?: string }) => {
				try {
					const { message, memberId } = data;

					// Get AI response
					const aiResponse = await chatService.getAIResponse(message);

					socket.emit('ai:response', {
						userMessage: message,
						aiResponse,
						timestamp: new Date(),
					});

					console.log('AI chat processed for:', memberId || 'anonymous');
				} catch (error) {
					console.error('Error in ai:chat:', error);
					socket.emit('error', { message: 'Failed to get AI response' });
				}
			},
		);

		// Close chat room
		socket.on('room:close', async (data: { roomId: string }) => {
			try {
				const { roomId } = data;
				const room = await chatService.closeRoom(
					shapeIntoMongooseObjectId(roomId),
				);

				if (room) {
					// Use room._id from database to ensure room name matches what users joined with
					const roomIdStr = room._id.toString();
					console.log(`Emitting room:closed to room:${roomIdStr}`);
					io.to(`room:${roomIdStr}`).emit('room:closed', { room });
					io.to('admin-room').emit('admin:room-closed', { room });
				}

				console.log(`Room ${roomId} closed`);
			} catch (error) {
				console.error('Error in room:close:', error);
				socket.emit('error', { message: 'Failed to close chat room' });
			}
		});

		// Handle disconnection
		socket.on('disconnect', () => {
			// Remove from connected maps
			for (const [memberId, socketId] of connectedUsers) {
				if (socketId === socket.id) {
					connectedUsers.delete(memberId);
					break;
				}
			}
			for (const [adminId, socketId] of connectedAdmins) {
				if (socketId === socket.id) {
					connectedAdmins.delete(adminId);
					adminActiveRooms.delete(adminId);
					adminLastSeen.set(adminId, new Date());

					// Broadcast admin offline status
					ioInstance.emit('admin:status', {
						isOnline: connectedAdmins.size > 0,
						adminCount: connectedAdmins.size,
						lastSeen: new Date(),
					});
					break;
				}
			}
			console.log('Socket disconnected:', socket.id);
		});
	});

	console.log('Socket.io initialized');
}

/** Broadcast member status update to all admins viewing the chat page */
export function broadcastMemberStatusUpdate(
	memberId: string,
	memberStatus: string,
): void {
	if (ioInstance) {
		ioInstance.to('admin-room').emit('member:status-updated', {
			memberId,
			memberStatus,
		});
		console.log(
			`Broadcasted member status update: ${memberId} -> ${memberStatus}`,
		);
	}
}

export { connectedUsers, connectedAdmins };
