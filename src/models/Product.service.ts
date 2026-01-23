import {
	Product,
	ProductInquiry,
	ProductUpdateInput,
} from '../libs/types/product';
import ProductModel from '../schema/Product.model';
import { ProductInput } from '../libs/types/product';
import { HttpCode } from '../libs/Error';
import Errors from '../libs/Error';
import { Message } from '../libs/Error';
import { shapeIntoMongooseObjectId } from '../libs/config';
import { ProductStatus } from '../libs/enums/product.enum';
import { ObjectId } from 'mongoose';
import { T } from '../libs/types/common';
import { ViewInput } from '../libs/types/view';
import { ViewGroup } from '../libs/enums/view.enum';
import ViewService from './View.service';
import { LikeGroup } from '../libs/enums/like.enum';
import LikeService from './Like.service';

class ProductService {
	private readonly productModel;
	public viewService;
	public likeService;
	constructor() {
		this.productModel = ProductModel;
		this.viewService = new ViewService();
		this.likeService = new LikeService();
	}

	/** SPA */
	public async getProducts(inquiry: ProductInquiry): Promise<Product[]> {
		const match: T = { productStatus: ProductStatus.PROCESS };

		if (inquiry.productCollection)
			match.productCollection = inquiry.productCollection;
		if (inquiry.search) {
			match.productName = { $regex: new RegExp(inquiry.search, 'i') };
		}
		const sort: T =
			inquiry.order === 'productPrice'
				? {
						[inquiry.order]: 1,
					} /* agar product price qatnashaytgan BO'LSA Product price ni birinchi arzonidan qimmatigacha chiqaradi, agar price  search da yoq bolsa , CREATION time bo'yicha chiqaradi keyingi qatordagi (ascending) */
				: {
						[inquiry.order]: -1,
					}; /*Create time (Eng yangi qoshilgandan boshlab => descending) */

		const result = await this.productModel
			.aggregate([
				{ $match: match } /* process dagi productlarni olib beryabdi*/,
				{ $sort: sort },
				{ $skip: (inquiry.page * 1 - 1) * inquiry.limit },
				{ $limit: inquiry.limit * 1 },
			])
			.exec();
		if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

		return result;
	}

	public async getProduct(
		memberId: ObjectId | null,
		id: string,
	): Promise<Product> {
		const productId = shapeIntoMongooseObjectId(id);

		let result = await this.productModel
			.findOne({ _id: productId, productStatus: ProductStatus.PROCESS })
			.exec();
		if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

		if (memberId) {
			// Check View Log Existance
			const input: ViewInput = {
				memberId: memberId,
				viewRefId: productId,
				viewGroup: ViewGroup.PRODUCT,
			};
			const existView = await this.viewService.checkViewExistance(input);

			console.log('exist:', !!existView);

			if (!existView) {
				// Insert View
				console.log('PLANNING TO INSERT NEW VIEW!');
				await this.viewService.insertMemberView(input);
				// Increase Counts
				result = await this.productModel
					.findByIdAndUpdate(
						productId,
						{ $inc: { productViews: +1 } },
						{ new: true },
					)
					.exec();
			}
		}
		return result;
	}

	public async likeTargetProduct(
		memberId: ObjectId,
		productId: ObjectId,
	): Promise<Product> {
		const product = await this.productModel.findOne({
			_id: productId,
			productStatus: ProductStatus.PROCESS,
		});

		if (!product) {
			throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
		}

		const modifier = await this.likeService.toggleLike({
			memberId,
			likeRefId: productId,
			likeGroup: LikeGroup.PRODUCT,
		});

		const result = await this.productModel.findByIdAndUpdate(
			productId,
			{ $inc: { productLikes: modifier } },
			{ new: true },
		);

		return result;
	}

	/** BSSR */

	public async getAllProducts(): Promise<Product[]> {
		const result = await this.productModel.find().exec();
		if (!result.length)
			throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

		return result;
	}
	public async createNewproduct(input: ProductInput): Promise<Product> {
		try {
			return await this.productModel.create(input);
		} catch (err) {
			console.log('Error, model: createNewProduct', err);
			throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
		}
	}

	public async updateChosenProduct(
		id: string,
		input: ProductUpdateInput,
	): Promise<Product> {
		id = shapeIntoMongooseObjectId(id);
		const result = this.productModel
			.findByIdAndUpdate({ _id: id }, input, { new: true })
			.exec();

		if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
		return result;
	}
}

export default ProductService;
