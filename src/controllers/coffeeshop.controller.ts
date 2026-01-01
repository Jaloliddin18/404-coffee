import { Request, Response } from 'express';
import { T } from '../libs/types/common';
import MemberService from '../models/Member.service';
import { MemberInput } from '../libs/types/member';
import { MemberType } from '../libs/enums/member.enum';

const coffeeshopController: T = {};

coffeeshopController.goHome = (req: Request, res: Response) => {
	try {
		console.log('goHome');
		res.send('Home Page');
	} catch (err) {
		console.log('Error, goHome', err);
	}
};
coffeeshopController.getLogin = (req: Request, res: Response) => {
	try {
		console.log('getLogin');
		res.send('Login Page');
	} catch (err) {
		console.log('Error, getLogin', err);
	}
};

coffeeshopController.getSignup = (req: Request, res: Response) => {
	try {
		console.log('getSignup');
		res.send('Signup Page');
	} catch (err) {
		console.log('Error, getSignup', err);
	}
};

coffeeshopController.processLogin = (req: Request, res: Response) => {
	try {
		console.log('processLogin');
		res.send('DONE');
	} catch (err) {
		console.log('Error, processLogin', err);
	}
};
coffeeshopController.processSignup = async (req: Request, res: Response) => {
	try {
		console.log('processSignup');

		const newMember: MemberInput = req.body;
		newMember.memberType = MemberType.COFFEESHOP;
		const memberService = new MemberService();
		const result = await memberService.processSignup(newMember);
		res.send(result);
	} catch (err) {
		console.log('Error, processSignup', err);
		res.send(err);
	}
};
export default coffeeshopController;
