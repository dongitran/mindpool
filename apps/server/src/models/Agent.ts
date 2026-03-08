import mongoose, { Schema, Document } from 'mongoose';

export interface AgentDocument extends Document {
  name: string;
  icon: string;
  specialty: string;
  systemPrompt: string;
  personality: {
    directness: number;
    creativity: number;
    skepticism: number;
  };
  signatureQuestion: string;
  isCustom: boolean;
}

const AgentSchema = new Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  specialty: { type: String, required: true },
  systemPrompt: { type: String, default: '' },
  personality: {
    directness: { type: Number, min: 0, max: 1, default: 0.5 },
    creativity: { type: Number, min: 0, max: 1, default: 0.5 },
    skepticism: { type: Number, min: 0, max: 1, default: 0.5 },
  },
  signatureQuestion: { type: String, default: '' },
  isCustom: { type: Boolean, default: false },
});

export const Agent = mongoose.model<AgentDocument>('Agent', AgentSchema);
