import { Link, useLocation } from 'react-router';
import { Home, BookOpen, FileQuestion, ClipboardList, MessageSquare, Brain, Database, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const navigation = [
  { name: '学习总览', href: '/', icon: Home },
  { name: '学习路径', href: '/learning-path', icon: BookOpen },
  { name: '题库练习', href: '/practice', icon: FileQuestion },
  { name: '模拟考试', href: '/mock-exam', icon: ClipboardList },
  { name: '社区', href: '/community', icon: MessageSquare },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { user } = useApp();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <div className="w-64 bg-white border-r border-gray-200 flex-col hidden lg:flex">
        <SidebarContent locationPath={location.pathname} isAdmin={isAdmin} onNavigate={undefined} />
      </div>

      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
      />
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent locationPath={location.pathname} isAdmin={isAdmin} onNavigate={onCloseMobile} />
      </aside>
    </>
  );
}

function SidebarContent({
  locationPath,
  isAdmin,
  onNavigate,
}: {
  locationPath: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Databricks 认证</h1>
            <p className="text-xs text-gray-500">学习平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = locationPath === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <Link
              to="/admin"
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                locationPath === '/admin' ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>管理后台</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs font-semibold text-gray-500 mb-3">考试方向</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded bg-blue-50 text-blue-700">
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">Data Analyst</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-purple-50 text-purple-700">
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">Data Engineer</span>
          </div>
        </div>
      </div>
    </>
  );
}

