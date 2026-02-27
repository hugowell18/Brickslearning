import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, login, cloudState } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('请输入邮箱。');
      return;
    }
    if (isRegister && !name.trim()) {
      setError('注册时请填写姓名。');
      return;
    }

    login(email, {
      name: isRegister ? name : undefined,
      role: role,
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{isRegister ? '注册' : '登录'}</h1>
        <p className="text-sm text-gray-600 mb-4">Databricks 认证学习平台</p>

        {cloudState.blocked && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">
            云端连接异常：{cloudState.message || '当前为严格一致模式，读写已阻断。'}
          </div>
        )}

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="you@example.com"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="请输入姓名"
                required
              />
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'student' | 'admin')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="student">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          )}

          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-lg py-2.5 font-medium">
            {isRegister ? '注册并进入' : '登录'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsRegister((v) => !v)}
          className="w-full mt-3 text-sm text-orange-700 hover:text-orange-800"
        >
          {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
        </button>
      </div>
    </div>
  );
}
