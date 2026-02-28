import { ChangeEvent, useEffect, useState } from 'react';
import { Bell, LogOut, Menu, Settings, Trash2, Upload, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { getJson, setJson, uploadAvatarImages } from '../../lib/supabaseClient';

type HeaderProps = {
  onMenuClick?: () => void;
};

type NotificationItem = {
  id: string;
  type?: string;
  isRead?: boolean;
  actorName?: string;
  contentPreview?: string;
  createdAt?: string;
  postId?: string;
  sourceType?: 'post' | 'comment';
  sourceId?: string;
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const TARGET_AVATAR_BYTES = 300 * 1024;

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('头像读取失败'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('头像图片解码失败'));
    img.src = dataUrl;
  });
}

async function cropAndCompressAvatar(file: File, targetSize = 512, targetBytes = TARGET_AVATAR_BYTES): Promise<string> {
  const srcDataUrl = await fileToDataUrl(file);
  const img = await loadImage(srcDataUrl);

  const side = Math.min(img.width, img.height);
  const sx = Math.floor((img.width - side) / 2);
  const sy = Math.floor((img.height - side) / 2);
  const sizes = [targetSize, Math.min(targetSize, 448), Math.min(targetSize, 384), Math.min(targetSize, 320), Math.min(targetSize, 256)];
  const qualities = [0.9, 0.84, 0.78, 0.72, 0.66, 0.6];

  let best = '';
  let bestBytes = Number.MAX_SAFE_INTEGER;

  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器不支持头像处理');
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    for (const q of qualities) {
      const out = canvas.toDataURL('image/webp', q);
      const bytes = estimateDataUrlBytes(out);
      if (bytes < bestBytes) {
        best = out;
        bestBytes = bytes;
      }
      if (bytes <= targetBytes) {
        return out;
      }
    }
  }

  // 如果浏览器不支持 webp 或仍超限，返回最小版本兜底
  if (!best) throw new Error('头像处理失败');
  return best;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout, cloudState, updateProfile } = useApp();
  const [openProfile, setOpenProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const notificationKey = user ? `db_notifications:${user.id}` : '';
  const unreadCount = notifications.filter((n) => !n?.isRead).length;

  useEffect(() => {
    setNameDraft(user?.name ?? '');
    setAvatarDraft(((user as { avatar?: string } | null)?.avatar || '').trim());
  }, [user?.name, (user as { avatar?: string } | null)?.avatar]);

  useEffect(() => {
    if (!user || cloudState.blocked) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const list = await getJson<NotificationItem[]>(`db_notifications:${user.id}`, []);
        if (cancelled) return;
        setNotifications(Array.isArray(list) ? list : []);
      } catch {
        if (cancelled) return;
        setNotifications([]);
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user?.id, cloudState.blocked]);

  const markAllRead = async () => {
    if (!user || !notificationKey) return;
    const next = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(next);
    try {
      await setJson(notificationKey, next);
    } catch {
      // ignore
    }
  };

  const markOneRead = async (id: string) => {
    if (!user || !notificationKey) return;
    const next = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(next);
    try {
      await setJson(notificationKey, next);
    } catch {
      // ignore
    }
  };

  const openNotification = async (n: NotificationItem) => {
    if (!n) return;
    if (n.id && !n.isRead) await markOneRead(n.id);
    setNotifOpen(false);
    const postId = n.postId || (n.sourceType === 'post' ? n.sourceId : undefined);
    const focusCommentId = n.sourceType === 'comment' ? n.sourceId : undefined;
    navigate('/community', {
      state: {
        openPostId: postId,
        focusCommentId,
      },
    });
  };

  const [avatarFullDraft, setAvatarFullDraft] = useState('');
  const [avatarThumbDraft, setAvatarThumbDraft] = useState('');

  useEffect(() => {
    if (!avatarDraft) {
      setAvatarFullDraft('');
      setAvatarThumbDraft('');
      return;
    }
    setAvatarFullDraft(avatarDraft);
    setAvatarThumbDraft(avatarDraft);
  }, [avatarDraft]);

  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件（PNG/JPG/WebP）');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('头像原图不能超过 8MB');
      return;
    }
    try {
      setError('');
      setProcessingAvatar(true);
      const [fullDataUrl, thumbDataUrl] = await Promise.all([
        cropAndCompressAvatar(file, 512, 300 * 1024),
        cropAndCompressAvatar(file, 128, 40 * 1024),
      ]);
      setAvatarDraft(fullDataUrl);
      setAvatarFullDraft(fullDataUrl);
      setAvatarThumbDraft(thumbDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!nameDraft.trim()) {
      setError('用户名不能为空');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const avatarValue = avatarDraft.trim();
      if (avatarValue.startsWith('data:image/')) {
        if (!user) throw new Error('用户状态异常');
        const fullDataUrl = avatarFullDraft || avatarValue;
        const thumbDataUrl = avatarThumbDraft || avatarValue;
        const uploaded = await uploadAvatarImages(user.id, { fullDataUrl, thumbDataUrl });
        await updateProfile({
          name: nameDraft.trim(),
          avatar: uploaded.avatar_url,
          avatar_url: uploaded.avatar_url,
          avatar_thumb_url: uploaded.avatar_thumb_url,
          avatar_updated_at: uploaded.avatar_updated_at,
        });
      } else {
        await updateProfile({
          name: nameDraft.trim(),
          avatar: avatarValue,
          avatar_url: avatarValue,
          avatar_thumb_url: avatarValue,
        });
      }
      setOpenProfile(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = user?.role === 'admin' ? '管理员' : '普通用户';
  const currentAvatar =
    (((user as { avatar_url?: string; avatar?: string } | null)?.avatar_url ||
      (user as { avatar_url?: string; avatar?: string } | null)?.avatar) ||
      '').trim();

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
              严格一致模式：云端受限
            </span>
          )}

          <button
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
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
                  <div className="text-xs text-gray-500">{roleLabel}</div>
                </div>
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
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

      {notifOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">消息通知</div>
            <button onClick={() => void markAllRead()} className="text-xs text-orange-600 hover:text-orange-700">
              全部已读
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500">暂无通知</div>
            )}
            {notifications.slice(0, 50).map((n) => (
              <button
                key={n.id}
                onClick={() => void openNotification(n)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${n.isRead ? 'bg-white' : 'bg-orange-50/50'}`}
              >
                <div className="text-sm text-gray-800">
                  {n.type === 'mention' ? (
                    <span>
                      <span className="font-semibold">{n.actorName || '有人'}</span> 在社区中 @ 了你
                    </span>
                  ) : (
                    <span>{n.contentPreview || '新消息'}</span>
                  )}
                </div>
                {n.contentPreview && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{n.contentPreview}</div>
                )}
                <div className="text-[11px] text-gray-400 mt-1">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑个人资料</DialogTitle>
            <DialogDescription>支持上传头像，保存后会同步到云端并在所有设备生效。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                {avatarDraft ? (
                  <img src={avatarDraft} alt="avatar-preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {processingAvatar ? '处理中...' : '上传头像'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAvatarDraft('');
                    setAvatarFullDraft('');
                    setAvatarThumbDraft('');
                  }}
                  className="inline-flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">头像链接（可选）</label>
              <Input
                value={avatarDraft}
                onChange={(e) => setAvatarDraft(e.target.value)}
                placeholder="https://example.com/avatar.jpg 或 data:image/..."
              />
              <p className="text-xs text-gray-500">
                上传图片会自动中心裁剪为 1:1，并压缩到约 300KB 以内（尽量保证清晰度）。
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">用户名</label>
              <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="请输入用户名" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">邮箱</label>
                <div className="text-sm text-gray-800 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">{user?.email || '-'}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">角色</label>
                <div className="text-sm text-gray-800 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">{roleLabel}</div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProfile(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving || processingAvatar}>
              {processingAvatar ? '头像处理中...' : saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
