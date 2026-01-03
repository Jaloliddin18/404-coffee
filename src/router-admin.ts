import express from 'express';
import coffeeshopController from './controllers/coffeeshop.controller';
import productController from './controllers/product.controller';
import makeUploader from './libs/utils/uploader';

const routerAdmin = express.Router();

/** Coffee Shop */

routerAdmin.get('/', coffeeshopController.goHome);
routerAdmin
	.get('/login', coffeeshopController.getLogin)
	.post('/login', coffeeshopController.processLogin);
routerAdmin
	.get('/signup', coffeeshopController.getSignup)
	.post(
		'/signup',
		makeUploader('members').single('memberImage'),
		coffeeshopController.processSignup,
	);
routerAdmin.get('/check-me', coffeeshopController.checkAuthSession);
routerAdmin.get('/logout', coffeeshopController.logout);

/** Products */
routerAdmin.get(
	'/product/all',
	coffeeshopController.verifyRestaurant,
	productController.getAllProducts,
);
routerAdmin.post(
	'/product/create',
	coffeeshopController.verifyRestaurant,
	makeUploader('products').array('productImages', 5),
	productController.createNewProduct,
);
routerAdmin.post(
	'/product/:id',
	coffeeshopController.verifyRestaurant,
	productController.updateChosenProduct,
);
/** Users */

export default routerAdmin;
