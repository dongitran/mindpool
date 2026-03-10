import { create } from 'zustand';
import type { Pool } from '@mindpool/shared';
import type { Conversation } from '@mindpool/shared';

export type Screen = 'welcome' | 'setup' | 'meeting' | 'history' | 'settings';

interface AppState {
  currentScreen: Screen;
  currentConversationId: string | null;
  currentMeetingId: string | null;
  conversations: Conversation[];
  pools: Pool[];
  error: string | null;

  setScreen: (screen: Screen) => void;
  setCurrentConversation: (id: string | null) => void;
  setCurrentMeeting: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setPools: (pools: Pool[]) => void;
  navigateToMeeting: (meetingId: string) => void;
  navigateToSetup: (conversationId?: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'welcome',
  currentConversationId: null,
  currentMeetingId: null,
  conversations: [],
  pools: [],
  error: null,

  setScreen: (screen) => set({ currentScreen: screen }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setCurrentMeeting: (id) => set({ currentMeetingId: id }),
  setConversations: (conversations) => set({ conversations }),
  setPools: (pools) => set({ pools }),
  navigateToMeeting: (meetingId) =>
    set({ currentScreen: 'meeting', currentMeetingId: meetingId }),
  navigateToSetup: (conversationId) =>
    set({ currentScreen: 'setup', currentConversationId: conversationId || null }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
