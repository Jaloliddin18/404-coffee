import express from 'express';
import coffeeshopController from './controllers/coffeeshop.controller';

const routerAdmin = express.Router();

routerAdmin.get('/', coffeeshopController.goHome);
routerAdmin.get('/login', coffeeshopController.getLogin);
routerAdmin.get('/signup', coffeeshopController.getSignup);

export default routerAdmin;
