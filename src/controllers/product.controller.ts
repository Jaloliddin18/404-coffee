import { Request, Response } from 'express';
import ProductService from '../models/Product.service';
import Errors, { HttpCode, Message } from '../libs/Error';
import { T } from '../libs/types/common';
import { AdminRequest } from '../libs/types/member';
import { ProductInput } from '../libs/types/product';

const productService = new ProductService();
const productController: T = {};

productController.getAllProducts = async (req: Request, res: Response) => {
	try {
		console.log('getAllProducts');

		res.render('products');
	} catch (err) {
		console.log('Error getAllProducts', err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};

productController.createNewProduct = async (
	req: AdminRequest,
	res: Response,
) => {
	try {
		console.log('createNewProduct');
		if (!req.files?.length)
			throw new Errors(HttpCode.INTERNAL_SERVER_ERROR, Message.CREATE_FAILED);

		res.send(
			`<script> alert("${'Successful Creation'}"); window.location.replace("/admin/product/all") </script>`,
		);
	} catch (err) {
		console.log('Error createNewProduct', err);
		const message =
			err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
		res.send(
			`<script> alert("${message}"); window.location.replace("/admin/product/all") </script>`,
		);
	}
};

productController.updateChosenProduct = async (req: Request, res: Response) => {
	try {
		console.log('updateChosenProduct');

		res.status(HttpCode.OK).json();
	} catch (err) {
		console.log('Error updateChosenProduct', err);
		if (err instanceof Errors) res.status(err.code).json(err);
		else res.status(Errors.standard.code).json(Errors.standard);
	}
};

export default productController;
