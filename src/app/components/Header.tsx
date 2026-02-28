import { useEffect, useState } from 'react';
import { Bell, LogOut, Menu, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

type HeaderProps = {
  onMenuClick?: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout, cloudState, updateProfile } = useApp();
  const [openProfile, setOpenProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNameDraft(user?.name ?? '');
  }, [user?.name]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!nameDraft.trim()) {
      setError('用户名不能为空。');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await updateProfile({ name: nameDraft.trim() });
      setOpenProfile(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <button
          className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">DB</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 lg:gap-3 ml-auto">
          {cloudState.blocked && (
            <span className="hidden xl:inline text-xs px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 max-w-xs truncate">
              严格一致模式：云端阻断
            </span>
          )}

          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </button>

          {!user ? (
            <Button onClick={() => navigate('/login')} className="bg-orange-600 hover:bg-orange-700 text-white">
              登录
            </Button>
          ) : (
            <>
              <button
                onClick={() => {
                  setError('');
                  setOpenProfile(true);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                aria-label="编辑资料"
              >
                <Settings className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.role === 'admin' ? '管理员' : '普通用户'}</div>
                </div>
                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <LogOut className="w-4 h-4 mr-1" />
                退出
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑个人资料</DialogTitle>
            <DialogDescription>修改用户名后将同步到云端。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-gray-700">用户名</label>
            <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="请输入用户名" />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProfile(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

