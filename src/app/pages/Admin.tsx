import { Users, BookOpen, FileQuestion, TrendingUp, Settings } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const userActivityData = [
  { date: '1月', users: 120 },
  { date: '2月', users: 145 },
  { date: '3月', users: 178 },
  { date: '4月', users: 210 },
  { date: '5月', users: 245 },
  { date: '6月', users: 289 },
];

const examPerformanceData = [
  { exam: 'Analyst', avgScore: 78 },
  { exam: 'Engineer', avgScore: 72 },
];

export default function Admin() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
          <p className="text-gray-600 mt-1">平台数据统计与管理</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
          系统设置
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="总用户数" value="289" change={12} icon={Users} color="bg-blue-500" />
        <StatCard title="题库总数" value="1,250" change={8} icon={FileQuestion} color="bg-green-500" />
        <StatCard title="学习模块" value="20" change={0} icon={BookOpen} color="bg-purple-500" />
        <StatCard title="平均通过率" value="75%" change={5} icon={TrendingUp} color="bg-orange-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">用户活跃趋势</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={userActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="活跃用户" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Exam Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">考试平均分</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={examPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="exam" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgScore" fill="#8b5cf6" name="平均分" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近注册用户</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">用户名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">邮箱</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">目标认证</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">注册时间</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">状态</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: '张三', email: 'zhang@example.com', target: 'Data Analyst', date: '2024-02-25', status: 'active' },
                { name: '李四', email: 'li@example.com', target: 'Data Engineer', date: '2024-02-24', status: 'active' },
                { name: '王五', email: 'wang@example.com', target: 'Both', date: '2024-02-23', status: 'active' },
                { name: '赵六', email: 'zhao@example.com', target: 'Data Analyst', date: '2024-02-22', status: 'inactive' },
              ].map((user, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900">{user.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.target}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.status === 'active' ? '活跃' : '未激活'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change > 0 && (
            <p className="text-sm text-green-600 mt-2">↑ {change}% vs 上月</p>
          )}
          {change === 0 && (
            <p className="text-sm text-gray-500 mt-2">- 无变化</p>
          )}
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
