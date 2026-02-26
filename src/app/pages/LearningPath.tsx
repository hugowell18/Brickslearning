import { useState } from 'react';
import { CheckCircle, Circle, Clock, ExternalLink, BookOpen } from 'lucide-react';
import { modules } from '../data/mockData';

export default function LearningPath() {
  const [selectedTrack, setSelectedTrack] = useState<'analyst' | 'engineer'>('analyst');

  const filteredModules = modules.filter(m => m.track === selectedTrack);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">学习路径</h1>
        <p className="text-gray-600 mt-1">跟随结构化的学习路径，系统掌握 Databricks 认证知识</p>
      </div>

      {/* Track Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setSelectedTrack('analyst')}
          className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all ${
            selectedTrack === 'analyst'
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="text-left">
            <h3 className="font-semibold text-lg">Data Analyst Associate</h3>
            <p className="text-sm mt-1 opacity-80">数据分析认证 • 10 个学习模块</p>
          </div>
        </button>
        <button
          onClick={() => setSelectedTrack('engineer')}
          className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all ${
            selectedTrack === 'engineer'
              ? 'bg-purple-50 border-purple-500 text-purple-900'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="text-left">
            <h3 className="font-semibold text-lg">Data Engineer Associate</h3>
            <p className="text-sm mt-1 opacity-80">数据工程认证 • 10 个学习模块</p>
          </div>
        </button>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">学习进度</h3>
          <span className={`text-sm font-medium ${selectedTrack === 'analyst' ? 'text-blue-600' : 'text-purple-600'}`}>
            {selectedTrack === 'analyst' ? '85%' : '75%'}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${selectedTrack === 'analyst' ? 'bg-blue-500' : 'bg-purple-500'} transition-all duration-300`}
            style={{ width: `${selectedTrack === 'analyst' ? 85 : 75}%` }}
          ></div>
        </div>
        <div className="flex gap-6 mt-4 text-sm text-gray-600">
          <span>✅ 已完成: {selectedTrack === 'analyst' ? 8 : 6}</span>
          <span>🔄 进行中: {selectedTrack === 'analyst' ? 1 : 2}</span>
          <span>⏸️ 未开始: {selectedTrack === 'analyst' ? 1 : 2}</span>
        </div>
      </div>

      {/* Module List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">学习模块</h3>
        {filteredModules.map((module, index) => (
          <ModuleCard key={module.id} module={module} index={index} track={selectedTrack} />
        ))}
      </div>

      {/* Official Resources */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">官方学习资源</h3>
            <p className="text-sm text-gray-700 mb-4">
              访问 Databricks Academy 获取官方学习材料、实验环境和认证指南
            </p>
            <a
              href="https://www.databricks.com/learn/certification"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
            >
              前往 Databricks Academy
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ module, index, track }) {
  const getStatusIcon = () => {
    if (module.status === 'completed') {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    if (module.status === 'in-progress') {
      return <Circle className="w-6 h-6 text-orange-500 fill-current opacity-50" />;
    }
    return <Circle className="w-6 h-6 text-gray-300" />;
  };

  const getStatusText = () => {
    if (module.status === 'completed') return '已完成';
    if (module.status === 'in-progress') return '进行中';
    return '未开始';
  };

  const getStatusColor = () => {
    if (module.status === 'completed') return 'bg-green-50 text-green-700 border-green-200';
    if (module.status === 'in-progress') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Number & Status Icon */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            track === 'analyst' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {index + 1}
          </div>
          {getStatusIcon()}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-3">{module.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{module.duration}</span>
            </div>
            <div className="flex gap-2">
              {module.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            {module.status === 'not-started' && (
              <button className={`px-4 py-2 ${
                track === 'analyst' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'
              } text-white rounded-lg transition-colors`}>
                开始学习
              </button>
            )}
            {module.status === 'in-progress' && (
              <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                继续学习
              </button>
            )}
            {module.status === 'completed' && (
              <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                复习内容
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
