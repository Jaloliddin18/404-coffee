import express from 'express';
import coffeeshopController from './controllers/coffeeshop.controller';
import productController from './controllers/product.controller';

const routerAdmin = express.Router();

/** Coffee Shop */

routerAdmin.get('/', coffeeshopController.goHome);
routerAdmin
	.get('/login', coffeeshopController.getLogin)
	.post('/login', coffeeshopController.processLogin);
routerAdmin
	.get('/signup', coffeeshopController.getSignup)
	.post('/signup', coffeeshopController.processSignup);
routerAdmin.get('/check-me', coffeeshopController.checkAuthSession);
routerAdmin.get('/logout', coffeeshopController.logout);

/** Products */
routerAdmin.get('/product/all', productController.getAllProducts);
routerAdmin.post('/product/create', productController.createNewProduct);
routerAdmin.post('/product/:id', productController.updateChosenProduct);
/** Users */

export default routerAdmin;
