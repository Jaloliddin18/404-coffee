import express from 'express';
import memberController from './controllers/member.controller';

const router = express.Router();

router
	.post('/member/login', memberController.login)
	.post('/member/signup', memberController.signup);

export default router;
