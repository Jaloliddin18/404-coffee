import mongoose, { Schema } from 'mongoose';
import { MessageSenderType } from '../libs/enums/chat.enum';

const messageSchema = new Schema(
	{
		roomId: {
			type: Schema.Types.ObjectId,
			ref: 'ChatRoom',
			required: true,
			index: true,
		},

		senderId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},

		senderType: {
			type: String,
			enum: MessageSenderType,
			required: true,
		},

		senderNick: {
			type: String,
			required: true,
		},

		content: {
			type: String,
			required: true,
		},

		seen: {
			type: Boolean,
			default: false,
		},

		seenAt: {
			type: Date,
			default: null,
		},
	},
	{ timestamps: true },
);

// Index for efficient message retrieval by room
messageSchema.index({ roomId: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
