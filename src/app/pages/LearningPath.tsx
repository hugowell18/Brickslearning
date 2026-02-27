import { useMemo, useState } from 'react';
import { CheckCircle, Circle, Clock, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Track = 'analyst' | 'engineer';
type Status = 'not-started' | 'in-progress' | 'completed';

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Number(((done / total) * 100).toFixed(1));
}

export default function LearningPath() {
  const { modules, updateProgress, cloudState } = useApp();
  const [selectedTrack, setSelectedTrack] = useState<Track>('analyst');

  const filteredModules = useMemo(
    () => modules.filter((m) => m.trackId === selectedTrack).sort((a, b) => a.order - b.order),
    [modules, selectedTrack],
  );

  const completed = filteredModules.filter((m) => m.status === 'completed').length;
  const inProgress = filteredModules.filter((m) => m.status === 'in-progress').length;
  const notStarted = filteredModules.filter((m) => (m.status ?? 'not-started') === 'not-started').length;
  const progressPct = percent(completed, filteredModules.length);

  const setStatus = (id: string, status: Status) => {
    if (cloudState.blocked) return;
    updateProgress(id, status);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">学习路径</h1>
        <p className="text-gray-600 mt-1">按官方课程链接学习，模块状态可手动更新并自动统计进度。</p>
      </div>

      {cloudState.blocked && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">
          云端连接异常：{cloudState.message || '严格一致模式下写操作已阻断。'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setSelectedTrack('analyst')}
          className={`text-left p-6 rounded-lg border-2 transition-all ${
            selectedTrack === 'analyst' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          <h3 className="font-semibold text-lg">Data Analyst Associate</h3>
          <p className="text-sm mt-1 opacity-80">已完成 {modules.filter((m) => m.trackId === 'analyst' && m.status === 'completed').length} / {modules.filter((m) => m.trackId === 'analyst').length} 个学习模块</p>
        </button>
        <button
          onClick={() => setSelectedTrack('engineer')}
          className={`text-left p-6 rounded-lg border-2 transition-all ${
            selectedTrack === 'engineer' ? 'bg-purple-50 border-purple-500 text-purple-900' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          <h3 className="font-semibold text-lg">Data Engineer Associate</h3>
          <p className="text-sm mt-1 opacity-80">已完成 {modules.filter((m) => m.trackId === 'engineer' && m.status === 'completed').length} / {modules.filter((m) => m.trackId === 'engineer').length} 个学习模块</p>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">学习进度</h3>
          <span className={`text-sm font-medium ${selectedTrack === 'analyst' ? 'text-blue-600' : 'text-purple-600'}`}>{progressPct}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${selectedTrack === 'analyst' ? 'bg-blue-500' : 'bg-purple-500'} transition-all duration-300`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-6 mt-4 text-sm text-gray-600">
          <span>已完成 {completed}</span>
          <span>进行中 {inProgress}</span>
          <span>未开始 {notStarted}</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">学习模块</h3>
        {filteredModules.map((module, index) => (
          <div key={module.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    selectedTrack === 'analyst' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {index + 1}
                </div>
                {module.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : module.status === 'in-progress' ? (
                  <Circle className="w-6 h-6 text-orange-500 fill-current opacity-50" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">{module.title}</h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      module.status === 'completed'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : module.status === 'in-progress'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {module.status === 'completed' ? '已完成' : module.status === 'in-progress' ? '进行中' : '未开始'}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-3">{module.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {module.bulletPoints.map((bp) => (
                    <span key={bp} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {bp}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setStatus(module.id, 'not-started')}
                    disabled={cloudState.blocked}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm disabled:opacity-50"
                  >
                    标记未开始
                  </button>
                  <button
                    onClick={() => setStatus(module.id, 'in-progress')}
                    disabled={cloudState.blocked}
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    标记进行中
                  </button>
                  <button
                    onClick={() => setStatus(module.id, 'completed')}
                    disabled={cloudState.blocked}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    标记已完成
                  </button>
                  <a
                    href={module.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    打开官方课程
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {module.completedAt && (
                  <p className="text-xs text-gray-500 mt-2 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    完成时间：{new Date(module.completedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
