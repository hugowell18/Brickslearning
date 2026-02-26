import { Outlet } from 'react-router';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AIAssistant from '../components/AIAssistant';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          <Outlet />
        </main>
      </div>
      <AIAssistant />
    </div>
  );
}
