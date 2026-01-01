import express from 'express';
import coffeeshopController from './controllers/coffeeshop.controller';

const routerAdmin = express.Router();

/** Coffee Shop */

routerAdmin.get('/', coffeeshopController.goHome);
routerAdmin
	.get('/login', coffeeshopController.getLogin)
	.post('/login', coffeeshopController.processLogin);
routerAdmin
	.get('/signup', coffeeshopController.getSignup)
	.post('/signup', coffeeshopController.processSignup);

/** Products */
/** Users */

export default routerAdmin;
