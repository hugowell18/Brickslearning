import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { getJson } from '../../lib/supabaseClient';
import { questions as questionBank } from '../data/mockData';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  buildLearningTrendFromCompletedMeta,
  calculateWeeklyCoverageFromCompletedMeta,
  getWeekStartMonday,
  toOneDecimal,
} from '../utils/completedMetaMetrics';

type AttemptEvent = { uid: string; correct: boolean; at: string };
type MockExamHistory = { id?: string; date?: string; submittedAt?: string };
type CompletedMeta = Record<string, string>;

function pct(done: number, total: number) {
  if (total <= 0) return 0;
  return toOneDecimal((done / total) * 100);
}

function percentChange(thisWeek: number, prevWeek: number) {
  if (prevWeek === 0) return thisWeek > 0 ? 100 : 0;
  return toOneDecimal(((thisWeek - prevWeek) / prevWeek) * 100);
}

export default function Dashboard() {
  const { user, modules, cloudState } = useApp();
  const [completedMeta, setCompletedMeta] = useState<CompletedMeta>({});
  const [attemptEvents, setAttemptEvents] = useState<AttemptEvent[]>([]);
  const [moduleCompleteMeta, setModuleCompleteMeta] = useState<Record<string, string>>({});
  const [mockExamHistory, setMockExamHistory] = useState<MockExamHistory[]>([]);

  useEffect(() => {
    if (!user || cloudState.blocked) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [qMeta, attempts, moduleMeta, exams] = await Promise.all([
          getJson<CompletedMeta>(`db_progress:completed_meta:${user.id}`, {}),
          getJson<AttemptEvent[]>(`db_progress:attempt_events:${user.id}`, []),
          getJson<Record<string, string>>(`db_progress:module_complete_meta:${user.id}`, {}),
          getJson<MockExamHistory[]>(`db_mock_exam_history:${user.id}`, []),
        ]);
        if (cancelled) return;
        setCompletedMeta(qMeta || {});
        setAttemptEvents(Array.isArray(attempts) ? attempts : []);
        setModuleCompleteMeta(moduleMeta || {});
        setMockExamHistory(Array.isArray(exams) ? exams : []);
      } catch {
        if (cancelled) return;
        setCompletedMeta({});
        setAttemptEvents([]);
        setModuleCompleteMeta({});
        setMockExamHistory([]);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, cloudState.blocked]);

  const analystIds = useMemo(
    () => new Set(questionBank.filter((q) => q.category === 'Data Analyst').map((q) => q.uid)),
    [],
  );
  const engineerIds = useMemo(
    () => new Set(questionBank.filter((q) => q.category === 'Data Engineer').map((q) => q.uid)),
    [],
  );
  const allIds = useMemo(() => new Set(questionBank.map((q) => q.uid)), []);

  const completedQuestionIds = useMemo(() => Object.keys(completedMeta), [completedMeta]);

  const analystDone = useMemo(() => completedQuestionIds.filter((id) => analystIds.has(id)).length, [completedQuestionIds, analystIds]);
  const engineerDone = useMemo(() => completedQuestionIds.filter((id) => engineerIds.has(id)).length, [completedQuestionIds, engineerIds]);

  const now = Date.now();
  const thisWeekStart = getWeekStartMonday(now);
  const prevWeekStart = thisWeekStart - 7 * 24 * 60 * 60 * 1000;

  const coverageAll = useMemo(
    () =>
      calculateWeeklyCoverageFromCompletedMeta({
        completedMeta,
        allowedIds: allIds,
        totalQuestions: allIds.size,
        nowTs: now,
      }),
    [completedMeta, allIds, now],
  );
  const coverageAnalyst = useMemo(
    () =>
      calculateWeeklyCoverageFromCompletedMeta({
        completedMeta,
        allowedIds: analystIds,
        totalQuestions: analystIds.size,
        nowTs: now,
      }),
    [completedMeta, analystIds, now],
  );
  const coverageEngineer = useMemo(
    () =>
      calculateWeeklyCoverageFromCompletedMeta({
        completedMeta,
        allowedIds: engineerIds,
        totalQuestions: engineerIds.size,
        nowTs: now,
      }),
    [completedMeta, engineerIds, now],
  );

  const thisWeekCoverageAll = coverageAll.thisWeekCoveragePct;
  const prevWeekCoverageAll = coverageAll.prevWeekCoveragePct;
  const thisWeekCoverageAnalyst = coverageAnalyst.thisWeekCoveragePct;
  const prevWeekCoverageAnalyst = coverageAnalyst.prevWeekCoveragePct;
  const thisWeekCoverageEngineer = coverageEngineer.thisWeekCoveragePct;
  const prevWeekCoverageEngineer = coverageEngineer.prevWeekCoveragePct;

  const completedModuleIds = useMemo(
    () => new Set(modules.filter((m) => m.status === 'completed').map((m) => m.id)),
    [modules],
  );
  const moduleDates = Object.entries(moduleCompleteMeta)
    .filter(([moduleId]) => completedModuleIds.has(moduleId))
    .map(([, v]) => Date.parse(v))
    .filter((v) => Number.isFinite(v)) as number[];
  const thisWeekModuleCount = moduleDates.filter((ts) => ts >= thisWeekStart && ts < thisWeekStart + 7 * 24 * 60 * 60 * 1000).length;
  const prevWeekModuleCount = moduleDates.filter((ts) => ts >= prevWeekStart && ts < thisWeekStart).length;
  const thisWeekModulePct = pct(thisWeekModuleCount, modules.length);
  const prevWeekModulePct = pct(prevWeekModuleCount, modules.length);

  const parseExamTs = (item: MockExamHistory) => Date.parse(item.submittedAt || item.date || '');
  const thisWeekExamCount = mockExamHistory.filter((it) => {
    const ts = parseExamTs(it);
    return Number.isFinite(ts) && ts >= thisWeekStart && ts < thisWeekStart + 7 * 24 * 60 * 60 * 1000;
  }).length;
  const prevWeekExamCount = mockExamHistory.filter((it) => {
    const ts = parseExamTs(it);
    return Number.isFinite(ts) && ts >= prevWeekStart && ts < thisWeekStart;
  }).length;

  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const dayMs = 24 * 60 * 60 * 1000;
  const learningTrendData = useMemo(
    () =>
      buildLearningTrendFromCompletedMeta({
        completedMeta,
        analystIds,
        engineerIds,
        nowTs: now,
        dayLabels,
      }),
    [completedMeta, analystIds, engineerIds, now],
  );

  const accuracyTrendData = Array.from({ length: 4 }).map((_, idx) => {
    const i = 3 - idx;
    const start = thisWeekStart - i * 7 * dayMs;
    const end = start + 7 * dayMs;
    let total = 0;
    let correct = 0;
    for (const evt of attemptEvents) {
      const ts = Date.parse(evt.at);
      if (Number.isNaN(ts)) continue;
      if (ts >= start && ts < end) {
        total += 1;
        if (evt.correct) correct += 1;
      }
    }
    return {
      week: `W${idx + 1}`,
      rate: total > 0 ? toOneDecimal((correct / total) * 100) : 0,
    };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-xl p-8 text-white shadow-lg">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">欢迎回来，{user?.name ?? '同学'}！</h1>
        <p className="text-lg opacity-90 mb-6">继续你的 Databricks 认证学习之旅。</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/practice" className="px-6 py-3 bg-white text-orange-600 rounded-lg font-medium hover:bg-gray-50">
            继续练习
          </Link>
          <Link
            to="/mock-exam"
            className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/30 border border-white/30"
          >
            开始模拟考试
          </Link>
        </div>
      </div>

      {cloudState.blocked && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">
          云端连接异常：{cloudState.message || '系统已进入严格一致只读阻断模式。'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="学习模块" value={`${modules.filter((m) => m.status === 'completed').length} / ${modules.length}`} change={thisWeekModulePct - prevWeekModulePct} />
        <StatCard title="已完成题目" value={`${completedQuestionIds.length}`} change={thisWeekCoverageAll - prevWeekCoverageAll} />
        <StatCard title="分析师进度" value={`${pct(analystDone, analystIds.size)}%`} change={thisWeekCoverageAnalyst - prevWeekCoverageAnalyst} />
        <StatCard title="工程师进度" value={`${pct(engineerDone, engineerIds.size)}%`} change={thisWeekCoverageEngineer - prevWeekCoverageEngineer} />
        <StatCard title="模拟考试" value={`${mockExamHistory.length}`} change={percentChange(thisWeekExamCount, prevWeekExamCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">学习趋势</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={learningTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="analyst" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Data Analyst" connectNulls={false} />
              <Line type="monotone" dataKey="engineer" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Data Engineer" connectNulls={false} />
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

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">正确率趋势</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={accuracyTrendData} barCategoryGap="8%" margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="accuracyBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.75} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="rate" fill="url(#accuracyBarGradient)" name="正确率(%)" radius={[10, 10, 0, 0]} barSize={56} maxBarSize={64}>
                {accuracyTrendData.map((entry, index) => (
                  <Cell
                    key={`acc-cell-${entry.week}-${index}`}
                    fillOpacity={entry.rate >= 80 ? 1 : entry.rate >= 60 ? 0.9 : 0.78}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change }: { title: string; value: string; change: number }) {
  const formatted = `${change >= 0 ? '+' : ''}${toOneDecimal(change)}%`;
  const changeClass = change >= 0 ? 'text-green-600' : 'text-red-600';
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      <p className={`text-sm mt-2 ${changeClass}`}>
        {formatted}
        <span className="text-gray-500 ml-1">vs 上周</span>
      </p>
    </div>
  );
}
