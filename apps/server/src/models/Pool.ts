import mongoose, { Schema, Document } from 'mongoose';

const MapNodeSchema = new Schema(
  {
    label: { type: String, required: true },
    sub: { type: String, default: '' },
    val: { type: String, default: '' },
    color: { type: String, default: '#888' },
  },
  { _id: false }
);

const AgentRefSchema = new Schema(
  {
    agentId: { type: String, required: true },
    icon: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: '' },
    state: {
      type: String,
      enum: ['speaking', 'queued', 'listening', 'moderating'],
      default: 'listening',
    },
    queuePosition: { type: Number },
  },
  { _id: false }
);

const SendAgentSchema = new Schema(
  {
    icon: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: '' },
  },
  { _id: false }
);

// Proper subdocument interfaces
export interface AgentRefDoc {
  agentId: string;
  icon: string;
  name: string;
  role: string;
  state: 'speaking' | 'queued' | 'listening' | 'moderating';
  queuePosition?: number;
}

export interface MapNodeDoc {
  label: string;
  sub: string;
  val: string;
  color: string;
}

export interface SendAgentDoc {
  icon: string;
  name: string;
  role: string;
}

export interface PoolDocument extends Document {
  title: string;
  topic: string;
  status: 'setup' | 'active' | 'completed';
  agents: AgentRefDoc[];
  messages: mongoose.Types.ObjectId[];
  queue: string[];
  conversationId: string;
  statusText: string;
  duration: number;
  sendAgents: SendAgentDoc[];
  mapCenter: string;
  mapCenterSub: string;
  mapNodes: MapNodeDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const PoolSchema = new Schema(
  {
    title: { type: String, required: true },
    topic: { type: String, required: true },
    status: {
      type: String,
      enum: ['setup', 'active', 'completed'],
      default: 'setup',
    },
    agents: [AgentRefSchema],
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
    queue: [{ type: String }],
    conversationId: { type: String, default: '' },
    statusText: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    sendAgents: [SendAgentSchema],
    mapCenter: { type: String, default: '' },
    mapCenterSub: { type: String, default: '' },
    mapNodes: [MapNodeSchema],
  },
  { timestamps: true }
);

export const Pool = mongoose.model<PoolDocument>('Pool', PoolSchema);
