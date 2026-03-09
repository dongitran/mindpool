import mongoose, { Schema, Document } from 'mongoose';

export interface MessageDocument extends Document {
  poolId: mongoose.Types.ObjectId;
  agentId: string;
  thinking: string | null;
  thinkSec: number | null;
  content: string;
  replyTo: mongoose.Types.ObjectId | null;
  timestamp: Date;
}

const MessageSchema = new Schema({
  poolId: { type: Schema.Types.ObjectId, ref: 'Pool', required: true },
  agentId: { type: String, required: true },
  thinking: { type: String, default: null },
  thinkSec: { type: Number, default: null },
  content: { type: String, required: true },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  timestamp: { type: Date, default: Date.now },
});

MessageSchema.index({ poolId: 1, timestamp: 1 });

export const Message = mongoose.model<MessageDocument>('Message', MessageSchema);
