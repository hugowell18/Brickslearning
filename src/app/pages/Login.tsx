import { FormEvent, useEffect, useState } from 'react';
import { Brain, Mail, Lock, Target, TrendingUp, Award, Users, BookOpen, BarChart3, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useApp();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('请输入邮箱。');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码。');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('注册时请填写姓名。');
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }

    try {
      await login(email, {
        password,
        name: !isLogin ? name : undefined,
        isSignup: !isLogin,
      });
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || '登录/注册失败，请重试。');
    }
  };

  const features = [
    {
      icon: Target,
      title: '精准学习路径',
      description: '根据考试大纲定制个性化学习计划',
      image: 'https://images.unsplash.com/photo-1748609160056-7b95f30041f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzJTIwZGFzaGJvYXJkJTIwbW9kZXJuJTIwd29ya3NwYWNlfGVufDF8fHx8MTc3MjI0NTIwOXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      icon: BookOpen,
      title: '丰富题库练习',
      description: '真题模拟，覆盖所有知识点',
      image: 'https://images.unsplash.com/photo-1771408427146-09be9a1d4535?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBsZWFybmluZyUyMHN0dWRlbnQlMjBjb21wdXRlcnxlbnwxfHx8fDE3NzIyNDUyMTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      icon: Award,
      title: '全真模拟考试',
      description: '真实考试环境，实时评分反馈',
      image: 'https://images.unsplash.com/photo-1761178334145-76c3d8ac30dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjZXJ0aWZpY2F0aW9uJTIwYWNoaWV2ZW1lbnQlMjBzdWNjZXNzfGVufDF8fHx8MTc3MjI0NTIxMXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      icon: BarChart3,
      title: '学习数据追踪',
      description: '可视化进度分析，错题专项练习',
      image: 'https://images.unsplash.com/photo-1748609160056-7b95f30041f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzJTIwZGFzaGJvYXJkJTIwbW9kZXJuJTIwd29ya3NwYWNlfGVufDF8fHx8MTc3MjI0NTIwOXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      icon: MessageCircle,
      title: '活跃学习社区',
      description: '与学员交流经验，在线答疑',
      image: 'https://images.unsplash.com/photo-1728933102332-a4f1a281a621?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHRlY2hub2xvZ3klMjBvZmZpY2V8ZW58MXx8fHwxNzcyMTcxMjM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      icon: Brain,
      title: '智能 AI 助手',
      description: '内置 AI 学习助手，实时答疑并提供个性化学习建议',
      image: 'https://images.unsplash.com/photo-1597866368390-8953d31bec0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMjA3fDB8MXxzZWFyY2h8MXx8YWl8ZW58MHx8fHwxNjgwOTAzMDcy&ixlib=rb-4.0.3&q=80&w=1080',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Platform Introduction */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 w-full p-12 flex flex-col">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 border border-white/30">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">
              Databricks 认证学习平台
            </h1>
            <p className="text-xl text-white/90 mb-2">
              Data Analyst & Data Engineer Associate
            </p>
            <p className="text-white/80">
              系统化学习 · 高效备考 · 轻松通过认证
            </p>
          </div>

          {/* Features Grid */}
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="group relative bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 hover:scale-105"
                  >
                    {/* Feature Image Background */}
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                      <ImageWithFallback
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>

                    {/* Feature Content */}
                    <div className="relative z-10 p-5">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3 border border-white/30">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-white font-semibold mb-1.5 text-base">
                        {feature.title}
                      </h3>
                      <p className="text-white/80 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12 bg-gray-50">
        <div className="max-w-md w-full">
          {/* Logo - Mobile */}
          <div className="lg:hidden mb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 rounded-2xl mb-4">
              <Brain className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Databricks 学习平台
            </h2>
            <p className="text-gray-600">登录或注册继续</p>
          </div>

          {error && (
            <div className="mb-4 text-red-600 text-sm text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-gray-700 font-semibold mb-1">姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {!isLogin && (
              <div>
                <label className="block text-gray-700 font-semibold mb-1">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
            >
              {isLogin ? '登录' : '注册'}
            </button>
          </form>

          <p className="mt-4 text-sm text-center">
            {isLogin ? '没有账号？' : '已有账号？'}
            <button
              type="button"
              className="ml-1 text-orange-500 font-semibold hover:underline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? '注册' : '登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
