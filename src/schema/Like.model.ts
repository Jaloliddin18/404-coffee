import mongoose, { Schema } from 'mongoose';
import { LikeGroup } from '../libs/enums/like.enum';

const likeSchema = new Schema(
	{
		likeGroup: { type: String, enum: LikeGroup, required: true },

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		likeRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
	},
	{ timestamps: true },
);

// one user can like one product only once
likeSchema.index({ memberId: 1, productId: 1 }, { unique: true });

export default mongoose.model('Like', likeSchema);
