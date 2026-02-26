import { useState } from 'react';
import { Clock, Play, Trophy, TrendingUp, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { examHistory } from '../data/mockData';

type ExamState = 'selection' | 'in-progress' | 'results';

export default function MockExam() {
  const [examState, setExamState] = useState<ExamState>('selection');
  const [selectedTrack, setSelectedTrack] = useState<'analyst' | 'engineer'>('analyst');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">模拟考试</h1>
        <p className="text-gray-600 mt-1">全真模拟考试环境，检验你的学习成果</p>
      </div>

      {examState === 'selection' && (
        <ExamSelection onStart={setExamState} selectedTrack={selectedTrack} setSelectedTrack={setSelectedTrack} />
      )}

      {examState === 'in-progress' && (
        <ExamInProgress onFinish={() => setExamState('results')} track={selectedTrack} />
      )}

      {examState === 'results' && (
        <ExamResults onRestart={() => setExamState('selection')} track={selectedTrack} />
      )}
    </div>
  );
}

function ExamSelection({ onStart, selectedTrack, setSelectedTrack }) {
  return (
    <>
      {/* Track Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setSelectedTrack('analyst')}
          className={`text-left p-6 rounded-lg border-2 transition-all ${
            selectedTrack === 'analyst'
              ? 'bg-blue-50 border-blue-500'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Analyst Associate</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 题目数量：45 题</p>
            <p>• 考试时长：90 分钟</p>
            <p>• 及格分数：70%</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedTrack('engineer')}
          className={`text-left p-6 rounded-lg border-2 transition-all ${
            selectedTrack === 'engineer'
              ? 'bg-purple-50 border-purple-500'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Engineer Associate</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 题目数量：60 题</p>
            <p>• 考试时长：120 分钟</p>
            <p>• 及格分数：70%</p>
          </div>
        </button>
      </div>

      {/* Exam Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900 mb-2">考试说明</h3>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• 考试开始后将启动倒计时，请合理安排时间</li>
              <li>• 所有题目均为单选题</li>
              <li>• 提交后无法修改答案</li>
              <li>• 完成后可查看成绩和错题分析</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={() => onStart('in-progress')}
          className={`flex items-center justify-center gap-3 px-8 py-4 ${
            selectedTrack === 'analyst' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'
          } text-white rounded-lg text-lg font-medium transition-colors`}
        >
          <Play className="w-6 h-6" />
          开始考试
        </button>
      </div>

      {/* Exam History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">考试历史</h3>
        <div className="space-y-3">
          {examHistory.map(exam => (
            <div key={exam.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  exam.track === 'analyst' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  <Trophy className={`w-6 h-6 ${
                    exam.track === 'analyst' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {exam.track === 'analyst' ? 'Data Analyst Associate' : 'Data Engineer Associate'}
                  </div>
                  <div className="text-sm text-gray-600">{exam.date} • {exam.duration}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  exam.score >= 70 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {exam.score}%
                </div>
                <div className="text-sm text-gray-600">{exam.totalQuestions} 题</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ExamInProgress({ onFinish, track }) {
  const [timeLeft, setTimeLeft] = useState(track === 'analyst' ? 5400 : 7200); // seconds

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <>
      {/* Timer Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {track === 'analyst' ? 'Data Analyst Associate' : 'Data Engineer Associate'} 模拟考试
          </h3>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className={`text-2xl font-bold ${timeLeft < 600 ? 'text-red-600' : 'text-gray-900'}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{ width: `${(timeLeft / (track === 'analyst' ? 5400 : 7200)) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">答题进度</span>
          <span className="text-sm font-medium text-gray-900">15 / {track === 'analyst' ? 45 : 60}</span>
        </div>
        <div className="grid grid-cols-10 gap-2">
          {Array.from({ length: track === 'analyst' ? 45 : 60 }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded flex items-center justify-center text-xs font-medium ${
                i < 15
                  ? 'bg-green-500 text-white'
                  : i === 15
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Current Question */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <span className="text-sm text-gray-600 mb-2 block">题目 16 / {track === 'analyst' ? 45 : 60}</span>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Which of the following is a key benefit of the Lakehouse architecture?
          </h3>
          <div className="space-y-3">
            {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, i) => (
              <button
                key={i}
                className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            上一题
          </button>
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
            下一题
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          onClick={onFinish}
          className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-lg font-medium transition-colors"
        >
          提交考试
        </button>
      </div>
    </>
  );
}

function ExamResults({ onRestart, track }) {
  const score = 85;
  const totalQuestions = track === 'analyst' ? 45 : 60;
  const correctAnswers = Math.round((score / 100) * totalQuestions);

  const pieData = [
    { name: '正确', value: correctAnswers, color: '#10b981' },
    { name: '错误', value: totalQuestions - correctAnswers, color: '#ef4444' },
  ];

  const weaknessData = [
    { topic: 'Delta Lake', correct: 8, total: 12 },
    { topic: 'SQL 优化', correct: 7, total: 10 },
    { topic: 'Unity Catalog', correct: 5, total: 8 },
  ];

  return (
    <>
      {/* Score Card */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">恭喜通过！</h2>
          <div className="text-6xl font-bold text-green-600 mb-2">{score}%</div>
          <p className="text-gray-600">
            {correctAnswers} / {totalQuestions} 题正确
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">答题分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">成绩分析</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">正确率</span>
              <span className="text-xl font-bold text-green-600">{score}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700">答题时间</span>
              <span className="text-xl font-bold text-blue-600">68 分钟</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-700">排名</span>
              <span className="text-xl font-bold text-purple-600">前 25%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weakness Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          薄弱知识点分析
        </h3>
        <div className="space-y-4">
          {weaknessData.map((item, index) => {
            const percentage = (item.correct / item.total) * 100;
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{item.topic}</span>
                  <span className="text-sm text-gray-600">
                    {item.correct} / {item.total} 正确
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onRestart}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
        >
          再次挑战
        </button>
        <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
          查看错题
        </button>
      </div>
    </>
  );
}
