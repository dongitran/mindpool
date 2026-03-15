import { create } from 'zustand';

export type Screen = 'welcome' | 'setup' | 'meeting' | 'history' | 'settings';

interface AppState {
  currentScreen: Screen;
  currentConversationId: string | null;
  currentMeetingId: string | null;
  initialSetupTopic: string | null;
  error: string | null;

  setScreen: (screen: Screen) => void;
  setCurrentConversation: (id: string | null) => void;
  setCurrentMeeting: (id: string | null) => void;
  navigateToMeeting: (meetingId: string) => void;
  navigateToSetup: (conversationId?: string) => void;
  setInitialSetupTopic: (topic: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'welcome',
  currentConversationId: null,
  currentMeetingId: null,
  initialSetupTopic: null,
  error: null,

  setScreen: (screen) => {
    set({ currentScreen: screen });
    if ((screen === 'welcome' || screen === 'history' || screen === 'settings') && window.location.pathname !== '/') {
      history.pushState(null, '', '/');
    }
  },
  setCurrentConversation: (id) => {
    set({ currentConversationId: id });
    if (id) history.replaceState(null, '', `/chat/${id}`);
  },
  setCurrentMeeting: (id) => set({ currentMeetingId: id }),
  navigateToMeeting: (meetingId) => {
    set({ currentScreen: 'meeting', currentMeetingId: meetingId });
    const target = `/meeting/${meetingId}`;
    if (window.location.pathname !== target) history.pushState(null, '', target);
  },
  navigateToSetup: (conversationId) => {
    set({ currentScreen: 'setup', currentConversationId: conversationId || null });
    const target = conversationId ? `/chat/${conversationId}` : '/chat/new';
    if (window.location.pathname !== target) history.pushState(null, '', target);
  },
  setInitialSetupTopic: (topic) => set({ initialSetupTopic: topic }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
