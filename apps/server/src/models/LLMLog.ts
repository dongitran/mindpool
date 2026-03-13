import mongoose, { Schema, Document } from 'mongoose';

export interface LLMLogDocument extends Document {
  callType: string;
  provider: string;
  llmModel: string;
  messages: Array<{ role: string; content: string }>;
  response: string;
  thinking: string | null;
  options: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  };
  durationMs: number;
  tokenEstimate: number;
  error: string | null;
  status: 'success' | 'error';
  createdAt: Date;
}

const LLMLogSchema = new Schema(
  {
    callType: { type: String, required: true },
    provider: { type: String, required: true },
    llmModel: { type: String, required: true },
    messages: [
      {
        role: { type: String, required: true },
        content: { type: String, required: true },
      },
    ],
    response: { type: String, default: '' },
    thinking: { type: String, default: null },
    options: {
      maxTokens: { type: Number },
      temperature: { type: Number },
      stream: { type: Boolean },
    },
    durationMs: { type: Number, default: 0 },
    tokenEstimate: { type: Number, default: 0 },
    error: { type: String, default: null },
    status: {
      type: String,
      enum: ['success', 'error'],
      default: 'success',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LLMLogSchema.index({ callType: 1, createdAt: -1 });
LLMLogSchema.index({ createdAt: -1 });
LLMLogSchema.index({ status: 1 });

export const LLMLog = mongoose.model<LLMLogDocument>('LLMLog', LLMLogSchema);

