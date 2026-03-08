import mongoose, { Schema, Document } from 'mongoose';

const ConversationMessageSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['bot', 'user', 'bot-agents', 'bot-created'],
      required: true,
    },
    time: { type: String, required: true },
    content: { type: String },
    // bot-agents specific
    intro: { type: String },
    agents: [
      {
        icon: String,
        name: String,
        desc: String,
        checked: { type: Boolean, default: false },
      },
    ],
    btnId: { type: String },
    meetingId: { type: String },
    // bot-created specific
    meetingTitle: { type: String },
    agentBadges: [{ type: String }],
  },
  { _id: false }
);

export interface ConversationDocument extends Document {
  title: string;
  sub: string;
  messages: typeof ConversationMessageSchema[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema(
  {
    title: { type: String, required: true },
    sub: { type: String, default: '' },
    messages: [ConversationMessageSchema],
  },
  { timestamps: true }
);

export const Conversation = mongoose.model<ConversationDocument>(
  'Conversation',
  ConversationSchema
);
