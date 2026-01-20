import mongoose, { Schema } from 'mongoose';
import { ChatRoomStatus } from '../libs/enums/chat.enum';
import { MemberStatus } from '../libs/enums/member.enum';

const chatRoomSchema = new Schema(
	{
		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},

		adminId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
		},

		memberNick: {
			type: String,
			required: true,
		},

		memberStatus: {
			type: String,
			enum: MemberStatus,
			default: MemberStatus.ACTIVE,
		},

		status: {
			type: String,
			enum: ChatRoomStatus,
			default: ChatRoomStatus.PENDING,
		},

		lastMessage: {
			type: String,
		},
	},
	{ timestamps: true },
);

export default mongoose.model('ChatRoom', chatRoomSchema);

