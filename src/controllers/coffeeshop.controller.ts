import { NextFunction, Request, Response } from 'express';
import { T } from '../libs/types/common';
import MemberService from '../models/Member.service';
import ChatService from '../models/Chat.service';
import { AdminRequest, LoginInput, MemberInput } from '../libs/types/member';
import { MemberType } from '../libs/enums/member.enum';
import Errors, { HttpCode, Message } from '../libs/Error';
import { shapeIntoMongooseObjectId } from '../libs/config';
import { broadcastMemberStatusUpdate } from '../libs/socket.handler';

const memberService = new MemberService();
const chatService = new ChatService();
const coffeeshopController: T = {};

coffeeshopController.goHome = (req: Request, res: Response) => {
	try {
		console.log('goHome');
		res.render('home');
	} catch (err) {
		console.log('Error goHome', err);
		res.redirect('/admin');
	}
};
coffeeshopController.getSignup = (req: Request, res: Response) => {
	try {
		console.log('getSignup');
		res.render('signup');
	} catch (err) {
		console.log('Error getSignup', err);
		res.redirect('/admin');
	}
};
coffeeshopController.getLogin = (req: Request, res: Response) => {
	try {
		console.log('getLogin');
		res.render('login');
	} catch (err) {
		console.log('Error getLogin', err);
		res.redirect('/admin');
	}
};

coffeeshopController.processSignup = async (
	req: AdminRequest,
	res: Response,
) => {
	try {
		console.log('processSignup');
		const file = req.file;
		if (!file)
			throw new Errors(HttpCode.BAD_REQUEST, Message.SOMETHING_WENT_WRONG);

		const newMember: MemberInput = req.body;
		newMember.memberImage = file?.path;
		newMember.memberType = MemberType.COFFEESHOP;
		const result = await memberService.processSignup(newMember);
		req.session.member = result;
		req.session.save(function () {
			res.redirect('/admin/product/all');
		});
	} catch (err) {
		console.log('Error, processSignup', err);
		const message =
			err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
		res.send(
			`<script> alert("${message}"); window.location.replace("/admin/signup") </script>`,
		);
		res.send(err);
	}
};

coffeeshopController.processLogin = async (
	req: AdminRequest,
	res: Response,
) => {
	try {
		console.log('processLogin');
		const input: LoginInput = req.body;
		const result = await memberService.processLogin(input);
		req.session.member = result;
		req.session.save(function () {
			res.redirect('/admin/product/all');
		});
	} catch (err) {
		console.log('Error, processLogin', err);
		const message =
			err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
		res.send(
			`<script> alert("${message}"); window.location.replace("/admin/login") </script>`,
		);
	}
};

coffeeshopController.logout = async (req: AdminRequest, res: Response) => {
	try {
		console.log('logout');
		req.session.destroy(function () {
			res.redirect('/admin');
		});
	} catch (err) {
		console.log('Error processLogin', err);
		res.redirect('/admin');
	}
};

coffeeshopController.getUsers = async (req: Request, res: Response) => {
	try {
		console.log('getUsers');
		const result = await memberService.getUsers();
		console.log('result', result);
		res.render('users', { users: result });
	} catch (err) {
		console.log('Error, getUsers', err);
		res.redirect('/admin/login');
	}
};

coffeeshopController.updateChosenUser = async (
	req: AdminRequest,
	res: Response,
) => {
	try {
		console.log('updateChosenUser');

		const result = await memberService.updateChosenUser(req.body);

		// Sync member status to their chat rooms
		if (req.body.memberStatus) {
			const updatedRooms = await chatService.updateMemberStatusInRooms(
				shapeIntoMongooseObjectId(req.body._id),
				req.body.memberStatus
			);
			console.log(`Updated member status in ${updatedRooms} chat rooms`);

			// Broadcast to admins viewing the chat page
			broadcastMemberStatusUpdate(req.body._id, req.body.memberStatus);
		}

		res.status(HttpCode.OK).json({ data: result });
	} catch (err) {
		console.log('Error, updateChosenUser', err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};

coffeeshopController.checkAuthSession = async (
	req: AdminRequest,
	res: Response,
) => {
	try {
		console.log('checkAuthSession');
		if (req.session?.member)
			res.send(`<script> alert("${req.session.member.memberNick}") </script>`);
		else res.send(`<script> alert("${Message.NOT_AUTHENICATED}") </script>`);
	} catch (err) {
		console.log('Error checkAuthSession', err);
		res.send(err);
	}
};

coffeeshopController.verifyCoffeeShop = (
	req: AdminRequest,
	res: Response,
	next: NextFunction,
) => {
	if (req.session?.member?.memberType === MemberType.COFFEESHOP) {
		req.member = req.session.member;
		next();
	} else {
		const message = Message.NOT_AUTHENICATED;
		res.send(
			`<script> alert("${message}"); window.location.replace("/admin/login"); </script>`,
		);
	}
};

coffeeshopController.getChatPage = async (req: AdminRequest, res: Response) => {
	try {
		console.log('getChatPage');
		res.render('chat', { admin: req.session.member });
	} catch (err) {
		console.log('Error getChatPage', err);
		res.redirect('/admin');
	}
};

export default coffeeshopController;
