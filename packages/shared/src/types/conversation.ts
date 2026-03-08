export type ConversationMessageType = 'bot' | 'user' | 'bot-agents' | 'bot-created';

export interface ConversationAgentSuggestion {
  icon: string;
  name: string;
  desc: string;
  checked: boolean;
}

export interface ConversationMessage {
  type: ConversationMessageType;
  time: string;
  content?: string;
  // bot-agents specific
  intro?: string;
  agents?: ConversationAgentSuggestion[];
  btnId?: string;
  meetingId?: string;
  // bot-created specific
  meetingTitle?: string;
  agentBadges?: string[];
}

export interface Conversation {
  _id: string;
  title: string;
  sub: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}
