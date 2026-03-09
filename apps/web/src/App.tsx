import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { MeetingScreen } from './screens/MeetingScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { api } from './lib/api';

function CurrentScreen() {
  const screen = useAppStore((s) => s.currentScreen);

  switch (screen) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'setup':
      return <SetupScreen />;
    case 'meeting':
      return <MeetingScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <WelcomeScreen />;
  }
}

export default function App() {
  const { setConversations, setPools, conversations, pools } = useAppStore();

  useEffect(() => {
    // Load initial data
    api.getConversations()
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {});
    api.getPools()
      .then((data) => setPools(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [setConversations, setPools]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <Sidebar
        meetings={pools.map((p) => ({
          _id: p._id,
          title: p.title,
          status: p.status,
          agents: p.agents || [],
          duration: p.duration,
          updatedAt: p.updatedAt,
        }))}
        conversations={conversations.map((c) => ({
          _id: c._id,
          title: c.title,
          sub: c.sub || '',
          meetings: [],
        }))}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <CurrentScreen />
      </main>
    </div>
  );
}
