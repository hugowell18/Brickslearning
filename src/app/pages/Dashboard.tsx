import { TrendingUp, TrendingDown, BookOpen, Trophy, Clock, Target, ArrowRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router';

const progressData = [
  { date: '周一', analyst: 65, engineer: 45 },
  { date: '周二', analyst: 68, engineer: 52 },
  { date: '周三', analyst: 72, engineer: 58 },
  { date: '周四', analyst: 75, engineer: 63 },
  { date: '周五', analyst: 78, engineer: 68 },
  { date: '周六', analyst: 82, engineer: 72 },
  { date: '周日', analyst: 85, engineer: 75 },
];

const accuracyData = [
  { week: 'W1', rate: 65 },
  { week: 'W2', rate: 72 },
  { week: 'W3', rate: 78 },
  { week: 'W4', rate: 85 },
];

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-xl p-8 text-white shadow-lg">
        <div className="max-w-3xl">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">欢迎回来，张三！👋</h1>
          <p className="text-lg opacity-90 mb-6">继续你的 Databricks 认证学习之旅，距离目标更近一步</p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/practice"
              className="px-6 py-3 bg-white text-orange-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              继续学习
            </Link>
            <Link
              to="/mock-exam"
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/30 transition-colors border border-white/30"
            >
              开始模拟考试
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="学习天数"
          value="28"
          change={12}
          trend="up"
          icon={Clock}
          color="bg-blue-500"
        />
        <StatCard
          title="完成题目"
          value="456"
          change={8}
          trend="up"
          icon={BookOpen}
          color="bg-green-500"
        />
        <StatCard
          title="正确率"
          value="85%"
          change={5}
          trend="up"
          icon={Target}
          color="bg-orange-500"
        />
        <StatCard
          title="模拟考试"
          value="12"
          change={-2}
          trend="down"
          icon={Trophy}
          color="bg-purple-500"
        />
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">学习进度趋势</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="analyst" stroke="#3b82f6" strokeWidth={2} name="Data Analyst" />
              <Line type="monotone" dataKey="engineer" stroke="#8b5cf6" strokeWidth={2} name="Data Engineer" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Data Analyst</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Data Engineer</span>
            </div>
          </div>
        </div>

        {/* Accuracy Rate */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">正确率趋势</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={accuracyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rate" fill="#f97316" name="正确率 %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exam Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExamProgressCard
          title="Data Analyst Associate"
          progress={85}
          completedModules={8}
          totalModules={10}
          color="blue"
        />
        <ExamProgressCard
          title="Data Engineer Associate"
          progress={75}
          completedModules={6}
          totalModules={10}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">今日学习建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="继续学习"
            description="SQL Warehouses & Query Optimization"
            link="/learning-path"
            color="orange"
          />
          <QuickActionCard
            title="错题复习"
            description="复习 12 道错题"
            link="/practice"
            color="red"
          />
          <QuickActionCard
            title="模拟考试"
            description="Data Analyst 全真模拟"
            link="/mock-exam"
            color="green"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {change}%
            </span>
            <span className="text-sm text-gray-500">vs 上周</span>
          </div>
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function ExamProgressCard({ title, progress, completedModules, totalModules, color }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className={`text-sm font-medium ${color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`}>
          {progress}%
        </span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full ${color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-600">
        已完成 {completedModules} / {totalModules} 个学习模块
      </p>
    </div>
  );
}

function QuickActionCard({ title, description, link, color }) {
  const colorClasses = {
    orange: 'bg-orange-50 border-orange-200 hover:border-orange-400',
    red: 'bg-red-50 border-red-200 hover:border-red-400',
    green: 'bg-green-50 border-green-200 hover:border-green-400',
  };

  return (
    <Link
      to={link}
      className={`${colorClasses[color]} border-2 rounded-lg p-4 transition-all group cursor-pointer`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
      </div>
    </Link>
  );
}
