import { Request, Response } from 'express';
import { T } from '../libs/types/common';
import ChatService from '../models/Chat.service';
import { ExtendedRequest } from '../libs/types/member';
import Errors, { HttpCode, Message } from '../libs/Error';
import { shapeIntoMongooseObjectId } from '../libs/config';

const chatService = new ChatService();
const chatController: T = {};

/** Get or create chat room for authenticated user */
chatController.getOrCreateRoom = async (req: ExtendedRequest, res: Response) => {
	try {
		console.log('getOrCreateRoom');
		const member = req.member;
		if (!member) {
			throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENICATED);
		}

		const room = await chatService.getOrCreateRoom({
			memberId: member._id,
			memberNick: member.memberNick,
		});

		res.status(HttpCode.OK).json(room);
	} catch (err) {
		console.log('Error getOrCreateRoom', err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};

/** Get all chat rooms for admin */
chatController.getAllRooms = async (req: Request, res: Response) => {
	try {
		console.log('getAllRooms');
		const rooms = await chatService.getAllRooms();
		res.status(HttpCode.OK).json(rooms);
	} catch (err) {
		console.log('Error getAllRooms', err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};

/** Get messages for a specific room */
chatController.getMessages = async (req: Request, res: Response) => {
	try {
		console.log('getMessages');
		const { roomId } = req.params;
		const messages = await chatService.getMessages(shapeIntoMongooseObjectId(roomId));
		res.status(HttpCode.OK).json(messages);
	} catch (err) {
		console.log('Error getMessages', err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};

/** AI Chat endpoint */
chatController.aiChat = async (req: Request, res: Response) => {
	try {
		console.log('aiChat');
		const { message } = req.body;

		if (!message || typeof message !== 'string') {
			throw new Errors(HttpCode.BAD_REQUEST, Message.SOMETHING_WENT_WRONG);
		}

		const aiResponse = await chatService.getAIResponse(message);

		res.status(HttpCode.OK).json({
			userMessage: message,
			aiResponse,
			timestamp: new Date(),
		});
	} catch (err) {
		console.log('Error aiChat', err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};

/** Close a chat room */
chatController.closeRoom = async (req: Request, res: Response) => {
	try {
		console.log('closeRoom');
		const { roomId } = req.params;
		const room = await chatService.closeRoom(shapeIntoMongooseObjectId(roomId));

		if (!room) {
			throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
		}

		res.status(HttpCode.OK).json(room);
	} catch (err) {
		console.log('Error closeRoom', err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};

export default chatController;
