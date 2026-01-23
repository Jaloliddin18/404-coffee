import MemberModel from '../schema/Member.model';
import {
	LoginInput,
	Member,
	MemberGetFavorite,
	MemberInput,
	MemberUpdateInput,
} from '../libs/types/member';
import Errors, { Message } from '../libs/Error';
import { HttpCode } from '../libs/Error';
import { MemberStatus, MemberType } from '../libs/enums/member.enum';
import { lookupFavorite, shapeIntoMongooseObjectId } from '../libs/config';
import * as bycript from 'bcryptjs';
import { Products } from '../libs/types/product';
import { T } from '../libs/types/common';
import { LikeGroup } from '../libs/enums/like.enum';
import LikeModel from '../schema/Like.model';

class MemberService {
	private readonly memberModel;
	private readonly likeModel;
	constructor() {
		this.memberModel = MemberModel;
		this.likeModel = LikeModel;
	}
	/** SPA */

	public async getCoffeeShop(): Promise<Member> {
		const result = await this.memberModel
			.findOne({ memberType: MemberType.COFFEESHOP })
			.exec();
		if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

		return result;
	}

	public async signup(input: MemberInput): Promise<Member> {
		const salt = await bycript.genSalt();
		input.memberPassword = await bycript.hash(input.memberPassword, salt);
		try {
			const result = await this.memberModel.create(input);
			result.memberPassword = '';
			return result.toJSON();
		} catch (err) {
			console.error('Error signup:', err);
			throw new Errors(HttpCode.BAD_REQUEST, Message.USED_NICK_PHONE);
		}
	}
	public async login(input: LoginInput): Promise<Member> {
		//TODO consider member status later
		const member = await this.memberModel
			.findOne(
				{
					memberNick: input.memberNick,
					memberStatus: { $ne: MemberStatus.DELETE },
				},
				{ memberNick: 1, memberPassword: 1, memberStatus: 1 },
			)
			.exec();
		if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);
		else if (member.memberStatus === MemberStatus.BLOCK) {
			throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
		}

		const isMatch = await bycript.compare(
			input.memberPassword,
			member.memberPassword,
		);
		if (!isMatch)
			throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
		return await this.memberModel.findById(member._id).lean().exec();
	}

	public async getMemberDetail(member: Member): Promise<Member> {
		const memberId = shapeIntoMongooseObjectId(member._id);
		const result = await this.memberModel
			.findOne({
				_id: memberId,
				memberStatus: MemberStatus.ACTIVE,
			})
			.exec();
		if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
		return result;
	}

	public async updateMember(
		member: Member,
		input: MemberUpdateInput,
	): Promise<Member> {
		const memberId = shapeIntoMongooseObjectId(member._id);
		const result = await this.memberModel
			.findByIdAndUpdate({ _id: memberId }, input, { new: true })
			.exec();
		if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
		return result;
	}

	public async getTopUsers(): Promise<Member[]> {
		const result = await this.memberModel
			.find({
				memberStatus: MemberStatus.ACTIVE,
				memberPoints: { $gte: 1 }, // $gte => greater than 1, query COMMAND
			})
			.sort({ memberPoints: -1 }) // yuqoridan pastga
			.limit(4)
			.exec();
		if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
		return result;
	}

	public async getFavoriteProducts(
		input: MemberGetFavorite,
	): Promise<Products> {
		const { _id, page, limit } = input;
		const memberId = shapeIntoMongooseObjectId(_id);
		const match: T = { likeGroup: LikeGroup.PRODUCT, memberId: memberId };
		const data = await this.likeModel.aggregate([
			{ $match: match },
			{ $sort: { updatedAt: -1 } },
			{
				$lookup: {
					from: 'products',
					localField: 'likeRefId',
					foreignField: '_id',
					as: 'favoriteProduct',
				},
			},
			{ $unwind: '$favoriteProduct' },
			{
				$facet: {
					list: [{ $skip: (page - 1) * limit }, { $limit: limit }],
					metaCounter: [{ $count: 'total' }],
				},
			},
		]);

		const result: Products = {
			list: [],
			metaCounter: data[0].metaCounter,
		};

		result.list = data[0].list.map((ele: T) => ele.favoriteProduct);
		return result;
	}

	public async addUserPoint(member: Member, point: number): Promise<Member> {
		const memberId = shapeIntoMongooseObjectId(member._id);

		return await this.memberModel
			.findOneAndUpdate(
				{
					_id: memberId,
					memberType: MemberType.USER,
					memberStatus: MemberStatus.ACTIVE,
				},
				{ $inc: { memberPoints: point } },
				{ new: true },
			)
			.exec();
	}

	/** BSSR */
	public async processSignup(input: MemberInput): Promise<Member> {
		const exist = await this.memberModel
			.findOne({ memberType: MemberType.COFFEESHOP })
			.exec();
		if (exist) throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);

		const salt = await bycript.genSalt();
		input.memberPassword = await bycript.hash(input.memberPassword, salt);

		try {
			const result = await this.memberModel.create(input);
			result.memberPassword = '';
			return result;
		} catch (err) {
			throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
		}
	}
	public async processLogin(input: LoginInput): Promise<Member> {
		const member = await this.memberModel
			.findOne(
				{ memberNick: input.memberNick },
				{ memberNick: 1, memberPassword: 1 },
			)
			.exec();
		if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);

		const isMatch = await bycript.compare(
			input.memberPassword,
			member.memberPassword,
		);

		if (!isMatch)
			throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
		return await this.memberModel.findById(member._id).exec();
	}

	public async getUsers(): Promise<Member[]> {
		const result = await this.memberModel
			.find({ memberType: MemberType.USER })
			.exec();
		if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

		return result;
	}

	public async updateChosenUser(input: MemberUpdateInput): Promise<Member> {
		input._id = shapeIntoMongooseObjectId(input._id);
		const result = await this.memberModel
			.findByIdAndUpdate({ _id: input._id }, input, { new: true })
			.exec();
		if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

		return result;
	}
}

export default MemberService;
