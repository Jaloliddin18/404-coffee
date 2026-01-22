import Errors from '../libs/Error';
import { T } from '../libs/types/common';
import { LikeInput, MeLiked } from '../libs/types/like';
import LikeModel from '../schema/Like.model';
import { HttpCode } from '../libs/Error';
import { Message } from '../libs/Error';

class LikeService {
	private readonly likeModel;
	constructor() {
		this.likeModel = LikeModel;
	}

	public async toggleLike(input: LikeInput): Promise<number> {
		const search: T = { memberId: input.memberId, likeRefId: input.likeRefId },
			exist = await this.likeModel.findOne(search).exec();
		let modifier = 1;

		if (exist) {
			await this.likeModel.findOneAndDelete(search).exec();
			modifier = -1;
		} else {
			try {
				await this.likeModel.create(input);
			} catch (err) {
				console.log('ERROR, model:insertProductLike: ', err);
				throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
			}
		}
		console.log(`- Like modifier ${modifier} -`);
		return modifier;
	}
}
