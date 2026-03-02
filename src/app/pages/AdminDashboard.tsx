import { useEffect, useMemo, useState } from 'react';
import { getJson, listJsonByPrefix } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import { questions as questionBank } from '../data/mockData';
import {
  buildLearningTrendFromCompletedMeta,
  getWeekStartMonday,
  toOneDecimal,
} from '../utils/completedMetaMetrics';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type ProfileLite = {
  id: string;
  email?: string;
  name?: string;
  role?: 'student' | 'instructor' | 'admin';
};

type AttemptEvent = { uid: string; correct: boolean; at: string };
type MockExamHistory = { id?: string; date?: string; submittedAt?: string; score?: number };
type CompletedMeta = Record<string, string>;
type ModuleCompleteMeta = Record<string, string>;

function toLegacyUserId(email?: string) {
  if (!email) return '';
  const normalized = email.trim().toLowerCase();
  return `u_${normalized.replace(/[^a-z0-9]/g, '_')}`;
}

function pct(done: number, total: number) {
  if (total <= 0) return 0;
  return toOneDecimal((done / total) * 100);
}

export default function AdminDashboard() {
  const { user, cloudState } = useApp();
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [completedMeta, setCompletedMeta] = useState<CompletedMeta>({});
  const [attemptEvents, setAttemptEvents] = useState<AttemptEvent[]>([]);
  const [moduleCompleteMeta, setModuleCompleteMeta] = useState<ModuleCompleteMeta>({});
  const [mockExamHistory, setMockExamHistory] = useState<MockExamHistory[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || cloudState.blocked) return;
    let cancelled = false;
    const loadProfiles = async () => {
      try {
        const rows = await listJsonByPrefix<ProfileLite>('db_profile:');
        if (cancelled) return;
        const all = (rows || []).map((r) => r.value).filter(Boolean) as ProfileLite[];
        const students = all.filter((p) => p.id && p.role !== 'admin');
        setProfiles(students);
        if (!selectedStudentId && students.length > 0) setSelectedStudentId(students[0].id);
      } catch {
        if (!cancelled) setProfiles([]);
      }
    };
    void loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, cloudState.blocked]);

  useEffect(() => {
    if (!selectedStudentId || cloudState.blocked) {
      setCompletedMeta({});
      setAttemptEvents([]);
      setModuleCompleteMeta({});
      setMockExamHistory([]);
      return;
    }
    let cancelled = false;
    const loadStudent = async () => {
      try {
        const selectedProfile = profiles.find((p) => p.id === selectedStudentId);
        const legacyId = toLegacyUserId(selectedProfile?.email);
        const candidateIds = Array.from(new Set([selectedStudentId, legacyId].filter(Boolean)));

        const completedMetaList = await Promise.all(
          candidateIds.map((id) => getJson<CompletedMeta>(`db_progress:completed_meta:${id}`, {})),
        );
        const attemptList = await Promise.all(
          candidateIds.map((id) => getJson<AttemptEvent[]>(`db_progress:attempt_events:${id}`, [])),
        );
        const moduleMetaList = await Promise.all(
          candidateIds.map((id) => getJson<ModuleCompleteMeta>(`db_progress:module_complete_meta:${id}`, {})),
        );
        const examList = await Promise.all(
          candidateIds.map((id) => getJson<MockExamHistory[]>(`db_mock_exam_history:${id}`, [])),
        );

        if (cancelled) return;

        const mergedCompletedMeta = completedMetaList.reduce<CompletedMeta>(
          (acc, cur) => ({ ...acc, ...(cur || {}) }),
          {},
        );
        const mergedAttempts = attemptList.flatMap((arr) => (Array.isArray(arr) ? arr : []));
        const mergedModuleMeta = moduleMetaList.reduce<ModuleCompleteMeta>(
          (acc, cur) => ({ ...acc, ...(cur || {}) }),
          {},
        );
        const mergedExams = examList.flatMap((arr) => (Array.isArray(arr) ? arr : []));

        setCompletedMeta(mergedCompletedMeta);
        setAttemptEvents(mergedAttempts);
        setModuleCompleteMeta(mergedModuleMeta);
        setMockExamHistory(mergedExams);
      } catch {
        if (cancelled) return;
        setCompletedMeta({});
        setAttemptEvents([]);
        setModuleCompleteMeta({});
        setMockExamHistory([]);
      }
    };
    void loadStudent();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, profiles, cloudState.blocked]);

  const analystIds = useMemo(
    () => new Set(questionBank.filter((q) => q.category === 'Data Analyst').map((q) => q.uid)),
    [],
  );
  const engineerIds = useMemo(
    () => new Set(questionBank.filter((q) => q.category === 'Data Engineer').map((q) => q.uid)),
    [],
  );
  const completedIds = useMemo(() => Object.keys(completedMeta), [completedMeta]);
  const analystDone = useMemo(() => completedIds.filter((id) => analystIds.has(id)).length, [completedIds, analystIds]);
  const engineerDone = useMemo(() => completedIds.filter((id) => engineerIds.has(id)).length, [completedIds, engineerIds]);

  const now = Date.now();
  const thisWeekStart = getWeekStartMonday(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
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
    const weekDate = new Date(start);
    const month = weekDate.getMonth() + 1;
    const firstDayOfMonth = new Date(weekDate.getFullYear(), weekDate.getMonth(), 1);
    const weekOfMonth = Math.ceil((weekDate.getDate() + firstDayOfMonth.getDay()) / 7);
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
      week: `${month}月W${weekOfMonth}`,
      rate: total > 0 ? toOneDecimal((correct / total) * 100) : 0,
    };
  });

  const selectedStudent = profiles.find((p) => p.id === selectedStudentId);
  const avgExamScore = mockExamHistory.length
    ? toOneDecimal(mockExamHistory.reduce((s, e) => s + Number(e.score || 0), 0) / mockExamHistory.length)
    : 0;
  const moduleDone = Object.keys(moduleCompleteMeta).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h1 className="text-2xl font-bold text-gray-900">Admin 学员学习看板</h1>
        <p className="text-gray-600 mt-1">选择学员后查看该学员学习趋势与考试表现</p>
        <div className="mt-4 max-w-md">
          <label className="block text-sm text-gray-600 mb-1">学员选择</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            {profiles.length === 0 ? <option value="">暂无学员</option> : null}
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.email || p.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cloudState.blocked ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">
          云端连接异常：{cloudState.message || '当前为严格一致模式，无法读取学员数据。'}
        </div>
      ) : null}

      {selectedStudentId ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="学员" value={selectedStudent?.name || selectedStudent?.email || selectedStudentId} />
            <StatCard title="已完成题目" value={`${completedIds.length}`} />
            <StatCard title="分析师进度" value={`${pct(analystDone, analystIds.size)}%`} />
            <StatCard title="工程师进度" value={`${pct(engineerDone, engineerIds.size)}%`} />
            <StatCard title="模拟考试均分" value={`${avgExamScore}%`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard title="完成模块数" value={moduleDone} />
            <StatCard title="模拟考试次数" value={mockExamHistory.length} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">学习趋势</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={learningTrendData} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 16 }} padding={{ left: 12, right: 12 }} />
                  <YAxis allowDecimals={false} width={34} tick={{ fontSize: 16 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="analyst" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} name="Data Analyst" />
                  <Line type="monotone" dataKey="engineer" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} name="Data Engineer" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">正确率趋势</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={accuracyTrendData} barCategoryGap="10%" margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 16 }}/>
                  <YAxis domain={[0, 100]} tick={{ fontSize: 16 }}/>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="rate" fill="#f97316" name="正确率(%)" radius={[8, 8, 0, 0]} barSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-gray-500">
          请选择一个学员查看学习数据。
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2 break-all">{value}</p>
    </div>
  );
}
