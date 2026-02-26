import { useState } from 'react';
import { Brain, Mail, Lock, TrendingUp, Award, Users } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-lg text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 border border-white/30">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Databricks 认证学习平台</h1>
          <p className="text-xl mb-8 opacity-90">
            系统化学习，高效备考，轻松通过 Databricks 认证考试
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">全真模拟考试</div>
                <div className="text-sm opacity-80">体验真实考试环境</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">智能学习路径</div>
                <div className="text-sm opacity-80">个性化推荐学习内容</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">活跃学习社区</div>
                <div className="text-sm opacity-80">与同学交流学习经验</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12">
      <div className="max-w-md w-full">
        {/* Logo - Desktop */}
        <div className="text-center mb-8 lg:hidden">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Databricks 认证学习平台</h1>
          <p className="text-gray-600">开启你的数据认证之旅</p>
        </div>

        <div className="hidden lg:block text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎回来</h1>
          <p className="text-gray-600">登录继续你的学习之旅</p>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-center font-medium transition-all ${
                isLogin
                  ? 'text-orange-600 border-b-2 border-orange-500'
                  : 'text-gray-600 border-b-2 border-transparent'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-center font-medium transition-all ${
                !isLogin
                  ? 'text-orange-600 border-b-2 border-orange-500'
                  : 'text-gray-600 border-b-2 border-transparent'
              }`}
            >
              注册
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">邮箱地址</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>

            {/* Name (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                <input
                  type="text"
                  placeholder="张三"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            )}

            {/* Exam Selection (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标认证</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-700">Data Analyst Associate</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-700">Data Engineer Associate</span>
                  </label>
                </div>
              </div>
            )}

            {/* Remember Me / Forgot Password */}
            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-orange-500" />
                  <span className="text-gray-600">记住我</span>
                </label>
                <button type="button" className="text-orange-600 hover:text-orange-700">
                  忘记密码？
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-700 transition-all"
            >
              {isLogin ? '登录' : '注册'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">或者</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button className="w-full py-3 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              使用 Google 登录
            </button>
            <button className="w-full py-3 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              使用 GitHub 登录
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          继续使用即表示您同意我们的
          <button className="text-orange-600 hover:text-orange-700 ml-1">服务条款</button>
          和
          <button className="text-orange-600 hover:text-orange-700 ml-1">隐私政策</button>
        </p>
      </div>
      </div>
    </div>
  );
}
