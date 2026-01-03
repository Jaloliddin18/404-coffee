import { Product } from '../libs/types/product';
import ProductModel from '../schema/Product.model';
import { ProductInput } from '../libs/types/product';
import { HttpCode } from '../libs/Error';
import Errors from '../libs/Error';
import { Message } from '../libs/Error';

class ProductService {
	private readonly productModel;
	constructor() {
		this.productModel = ProductModel;
	}
	/** BSSR */
	public async createNewproduct(input: ProductInput): Promise<Product> {
		try {
			return await this.productModel.create(input);
		} catch (err) {
			console.log('Error, model: createNewProduct', err);
			throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
		}
	}
}

export default ProductService;
