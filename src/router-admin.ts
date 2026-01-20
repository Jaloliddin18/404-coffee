import express from 'express';
import coffeeshopController from './controllers/coffeeshop.controller';
import productController from './controllers/product.controller';
import chatController from './controllers/chat.controller';
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
	coffeeshopController.verifyCoffeeShop,
	productController.getAllProducts,
);
routerAdmin.post(
	'/product/create',
	coffeeshopController.verifyCoffeeShop,
	makeUploader('products').array('productImages', 5),
	productController.createNewProduct,
);
routerAdmin.post(
	'/product/:id',
	coffeeshopController.verifyCoffeeShop,
	productController.updateChosenProduct,
);
/** Users */
routerAdmin.get(
	'/user/all',
	coffeeshopController.verifyCoffeeShop,
	coffeeshopController.getUsers,
);
routerAdmin.post('/user/edit', coffeeshopController.updateChosenUser);

/** Chat */
routerAdmin.get(
	'/chat/all',
	coffeeshopController.verifyCoffeeShop,
	coffeeshopController.getChatPage,
);
routerAdmin.get(
	'/chat/rooms',
	coffeeshopController.verifyCoffeeShop,
	chatController.getAllRooms,
);
routerAdmin.get(
	'/chat/messages/:roomId',
	coffeeshopController.verifyCoffeeShop,
	chatController.getMessages,
);
routerAdmin.post(
	'/chat/room/:roomId/close',
	coffeeshopController.verifyCoffeeShop,
	chatController.closeRoom,
);

export default routerAdmin;

