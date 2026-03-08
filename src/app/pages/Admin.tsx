import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download, RefreshCw, ShieldAlert, Users } from 'lucide-react';
import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ConfirmActionDialog from '../components/ConfirmActionDialog';
import { useApp } from '../../context/AppContext';
import { getJson, listJsonByPrefix, setJson } from '../../lib/supabaseClient';
import { questions } from '../data/mockData';
import { buildLearningTrendFromCompletedMeta, getWeekStartMonday, toOneDecimal } from '../utils/completedMetaMetrics';

type AdminTab = 'overview' | 'users' | 'questionBank' | 'examConfig' | 'report' | 'audit';
type OverviewTab = 'overall' | 'student';

type UserProfile = {
  id: string;
  email?: string;
  name?: string;
  role?: 'student' | 'instructor' | 'admin';
  status?: 'active' | 'deleted';
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type AttemptEvent = { uid: string; correct: boolean; at: string };
type MockExamHistory = { score?: number; submittedAt?: string; date?: string };
type CompletedMeta = Record<string, string>;
type ModuleCompleteMeta = Record<string, string>;

type UserMetrics = {
  profile: UserProfile;
  completedMeta: CompletedMeta;
  attemptEvents: AttemptEvent[];
  moduleCompleteMeta: ModuleCompleteMeta;
  mockExamHistory: MockExamHistory[];
};

type ExamConfig = {
  durationMinutes: number;
  questionCount: number;
  passingScore: number;
};

type AuditLog = {
  at: string;
  actor: string;
  action: string;
  detail: string;
};

type ConfirmState = null | { type: 'delete' | 'restore'; profile: UserProfile };

type ProgressDistributionDatum = {
  name: string;
  analyst: number;
  engineer: number;
  analystUsers: string[];
  engineerUsers: string[];
};

const DEFAULT_EXAM_CONFIG: ExamConfig = {
  durationMinutes: 90,
  questionCount: 45,
  passingScore: 70,
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ANALYST_COLOR = '#2563eb';
const ENGINEER_COLOR = '#7c3aed';
const EXAM_COLOR = '#f97316';

function isImageOpt(v: string) {
  return typeof v === 'string' && v.startsWith('data:image');
}

function toLegacyUserId(email?: string) {
  if (!email) return '';
  const normalized = email.trim().toLowerCase();
  return `u_${normalized.replace(/[^a-z0-9]/g, '_')}`;
}

function isDeletedProfile(profile?: UserProfile | null) {
  return profile?.is_deleted === true || profile?.status === 'deleted';
}

function mergeRecordMaps(items: Array<Record<string, string> | null | undefined>) {
  return items.reduce<Record<string, string>>((acc, cur) => ({ ...acc, ...(cur || {}) }), {});
}

function formatDateTime(value?: string | null) {
  if (!value) return '--';
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return '--';
    return new Date(ts).toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
}

function getLastActiveAt(attempts: AttemptEvent[], exams: MockExamHistory[], completedMeta: CompletedMeta) {
  const timestamps: number[] = [];
  attempts.forEach((evt) => {
    const ts = Date.parse(evt.at);
    if (!Number.isNaN(ts)) timestamps.push(ts);
  });
  exams.forEach((item) => {
    const ts = Date.parse(item.submittedAt || item.date || '');
    if (!Number.isNaN(ts)) timestamps.push(ts);
  });
  Object.values(completedMeta).forEach((value) => {
    const ts = Date.parse(value);
    if (!Number.isNaN(ts)) timestamps.push(ts);
  });
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function pct(done: number, total: number) {
  if (total <= 0) return 0;
  return toOneDecimal((done / total) * 100);
}

function parseExamTs(item: MockExamHistory) {
  return Date.parse(item.submittedAt || item.date || '');
}

function progressBucket(progressPct: number) {
  if (progressPct === 0) return '0%';
  if (progressPct < 25) return '1-24%';
  if (progressPct < 50) return '25-49%';
  if (progressPct < 75) return '50-74%';
  return '75-100%';
}

function getDisplayUserName(profile: UserProfile) {
  return profile.name || profile.email || profile.id;
}

async function safeListByPrefix<T>(prefix: string, fallback: Array<{ key: string; value: T }> = []) {
  try {
    return await listJsonByPrefix<T>(prefix);
  } catch {
    return fallback;
  }
}

async function safeGetJson<T>(key: string, fallback: T) {
  try {
    return await getJson<T>(key, fallback);
  } catch {
    return fallback;
  }
}

export default function Admin() {
  const { user, cloudState } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('overall');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [allMetrics, setAllMetrics] = useState<UserMetrics[]>([]);
  const [examConfig, setExamConfigState] = useState<ExamConfig>(DEFAULT_EXAM_CONFIG);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const analystIds = useMemo(() => new Set(questions.filter((q) => q.category === 'Data Analyst').map((q) => q.uid)), []);
  const engineerIds = useMemo(() => new Set(questions.filter((q) => q.category === 'Data Engineer').map((q) => q.uid)), []);

  const questionStats = useMemo(() => {
    const total = questions.length;
    const imageQuestions = questions.filter((q) => Boolean(q.img) || q.opts.some((opt) => isImageOpt(opt))).length;
    return {
      total,
      imageQuestions,
      analyst: questions.filter((q) => q.category === 'Data Analyst').length,
      engineer: questions.filter((q) => q.category === 'Data Engineer').length,
    };
  }, []);

  const appendAudit = async (action: string, detail: string) => {
    if (!user || cloudState.blocked) return;
    const next: AuditLog[] = [{ at: new Date().toISOString(), actor: `${user.name || user.email || user.id}(${user.email || user.id})`, action, detail }, ...auditLogs].slice(0, 200);
    setAuditLogs(next);
    await setJson<AuditLog[]>('db_admin:audit_logs', next);
  };  const loadAdminData = async () => {
    if (!user || cloudState.blocked) return;
    setLoading(true);
    setError('');
    try {
      const [profileItems, completedItems, attemptItems, moduleItems, examItems, cfg, logs] = await Promise.all([
        safeListByPrefix<UserProfile>('db_profile:'),
        safeListByPrefix<CompletedMeta>('db_progress:completed_meta:'),
        safeListByPrefix<AttemptEvent[]>('db_progress:attempt_events:'),
        safeListByPrefix<ModuleCompleteMeta>('db_progress:module_complete_meta:'),
        safeListByPrefix<MockExamHistory[]>('db_mock_exam_history:'),
        safeGetJson<ExamConfig>('db_admin:exam_config', DEFAULT_EXAM_CONFIG),
        safeGetJson<AuditLog[]>('db_admin:audit_logs', []),
      ]);

      const profileMap = new Map<string, UserProfile>();
      profileItems.forEach((item) => {
        if (item.value?.id) profileMap.set(item.value.id, item.value);
      });

      const profileList = Array.from(profileMap.values()).sort((a, b) =>
        getDisplayUserName(a).localeCompare(getDisplayUserName(b), 'zh-CN'),
      );

      const completedMap = new Map(completedItems.map((item) => [item.key, item.value || {}]));
      const attemptMap = new Map(attemptItems.map((item) => [item.key, Array.isArray(item.value) ? item.value : []]));
      const moduleMap = new Map(moduleItems.map((item) => [item.key, item.value || {}]));
      const examMap = new Map(examItems.map((item) => [item.key, Array.isArray(item.value) ? item.value : []]));

      const metrics: UserMetrics[] = profileList.map((profile) => {
        const candidateIds = Array.from(new Set([profile.id, toLegacyUserId(profile.email)].filter(Boolean)));
        return {
          profile,
          completedMeta: mergeRecordMaps(candidateIds.map((id) => completedMap.get(`db_progress:completed_meta:${id}`))),
          attemptEvents: candidateIds.flatMap((id) => attemptMap.get(`db_progress:attempt_events:${id}`) || []),
          moduleCompleteMeta: mergeRecordMaps(candidateIds.map((id) => moduleMap.get(`db_progress:module_complete_meta:${id}`))),
          mockExamHistory: candidateIds.flatMap((id) => examMap.get(`db_mock_exam_history:${id}`) || []),
        };
      });

      setProfiles(profileList);
      setAllMetrics(metrics);
      setExamConfigState(cfg);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, [user?.id, cloudState.blocked]);

  const studentMetrics = useMemo(
    () => allMetrics.filter((item) => item.profile.role === 'student' || item.profile.role === 'instructor'),
    [allMetrics],
  );
  const activeStudentMetrics = useMemo(
    () => studentMetrics.filter((item) => !isDeletedProfile(item.profile)),
    [studentMetrics],
  );

  useEffect(() => {
    if (!activeStudentMetrics.length) {
      if (selectedStudentId) setSelectedStudentId('');
      return;
    }
    if (activeStudentMetrics.some((item) => item.profile.id === selectedStudentId)) return;
    setSelectedStudentId(activeStudentMetrics[0]?.profile.id || '');
  }, [activeStudentMetrics, selectedStudentId]);

  const selectedMetrics = useMemo(
    () => activeStudentMetrics.find((item) => item.profile.id === selectedStudentId) || null,
    [activeStudentMetrics, selectedStudentId],
  );

  const overviewStats = useMemo(() => {
    const now = Date.now();
    const activeUsers7d = activeStudentMetrics.filter((item) =>
      item.attemptEvents.some((evt) => {
        const ts = Date.parse(evt.at);
        return !Number.isNaN(ts) && ts >= now - WEEK_MS;
      }),
    ).length;

    let practiceCorrect = 0;
    let practiceTotal = 0;
    let totalExamAttempts = 0;
    let examScoreSum = 0;
    activeStudentMetrics.forEach((item) => {
      item.attemptEvents.forEach((evt) => {
        practiceTotal += 1;
        if (evt.correct) practiceCorrect += 1;
      });
      item.mockExamHistory.forEach((exam) => {
        totalExamAttempts += 1;
        examScoreSum += Number(exam.score || 0);
      });
    });

    return {
      totalStudents: activeStudentMetrics.length,
      activeUsers7d,
      practiceAccuracy: practiceTotal ? toOneDecimal((practiceCorrect / practiceTotal) * 100) : 0,
      totalExamAttempts,
      averageExamScore: totalExamAttempts ? toOneDecimal(examScoreSum / totalExamAttempts) : 0,
    };
  }, [activeStudentMetrics]);

  const overallActivityTrend = useMemo(() => {
    const now = Date.now();
    const thisWeekStart = getWeekStartMonday(now);
    return Array.from({ length: 4 }).map((_, idx) => {
      const i = 3 - idx;
      const start = thisWeekStart - i * WEEK_MS;
      const end = start + WEEK_MS;
      const weekDate = new Date(start);
      const month = weekDate.getMonth() + 1;
      const firstDayOfMonth = new Date(weekDate.getFullYear(), weekDate.getMonth(), 1);
      const weekOfMonth = Math.ceil((weekDate.getDate() + firstDayOfMonth.getDay()) / 7);
      return {
        week: `${month}月W${weekOfMonth}`,
        activeCount: activeStudentMetrics.filter((item) =>
          item.attemptEvents.some((evt) => {
            const ts = Date.parse(evt.at);
            return !Number.isNaN(ts) && ts >= start && ts < end;
          }),
        ).length,
        examCount: activeStudentMetrics.reduce((sum, item) => {
          const count = item.mockExamHistory.filter((exam) => {
            const ts = parseExamTs(exam);
            return !Number.isNaN(ts) && ts >= start && ts < end;
          }).length;
          return sum + count;
        }, 0),
      };
    });
  }, [activeStudentMetrics]);

  const overallProgressDistribution = useMemo<ProgressDistributionDatum[]>(() => {
    const buckets: ProgressDistributionDatum[] = [
      { name: '0%', analyst: 0, engineer: 0, analystUsers: [], engineerUsers: [] },
      { name: '1-24%', analyst: 0, engineer: 0, analystUsers: [], engineerUsers: [] },
      { name: '25-49%', analyst: 0, engineer: 0, analystUsers: [], engineerUsers: [] },
      { name: '50-74%', analyst: 0, engineer: 0, analystUsers: [], engineerUsers: [] },
      { name: '75-100%', analyst: 0, engineer: 0, analystUsers: [], engineerUsers: [] },
    ];
    const bucketMap = new Map(buckets.map((item) => [item.name, item]));

    activeStudentMetrics.forEach((item) => {
      const userName = getDisplayUserName(item.profile);
      const analystDone = Object.keys(item.completedMeta).filter((uid) => analystIds.has(uid)).length;
      const engineerDone = Object.keys(item.completedMeta).filter((uid) => engineerIds.has(uid)).length;
      const analystBucket = bucketMap.get(progressBucket(pct(analystDone, analystIds.size)));
      const engineerBucket = bucketMap.get(progressBucket(pct(engineerDone, engineerIds.size)));
      if (analystBucket) {
        analystBucket.analyst += 1;
        analystBucket.analystUsers.push(userName);
      }
      if (engineerBucket) {
        engineerBucket.engineer += 1;
        engineerBucket.engineerUsers.push(userName);
      }
    });

    return buckets;
  }, [activeStudentMetrics, analystIds, engineerIds]);  const overallTrackShare = useMemo(
    () => [
      {
        name: 'Data Analyst',
        value: activeStudentMetrics.filter((item) => {
          const analystDone = Object.keys(item.completedMeta).filter((uid) => analystIds.has(uid)).length;
          const engineerDone = Object.keys(item.completedMeta).filter((uid) => engineerIds.has(uid)).length;
          return analystDone >= engineerDone;
        }).length,
        color: ANALYST_COLOR,
      },
      {
        name: 'Data Engineer',
        value: activeStudentMetrics.filter((item) => {
          const analystDone = Object.keys(item.completedMeta).filter((uid) => analystIds.has(uid)).length;
          const engineerDone = Object.keys(item.completedMeta).filter((uid) => engineerIds.has(uid)).length;
          return engineerDone > analystDone;
        }).length,
        color: ENGINEER_COLOR,
      },
    ],
    [activeStudentMetrics, analystIds, engineerIds],
  );

  const selectedCompletedIds = useMemo(() => Object.keys(selectedMetrics?.completedMeta || {}), [selectedMetrics]);
  const selectedAnalystDone = useMemo(() => selectedCompletedIds.filter((uid) => analystIds.has(uid)).length, [selectedCompletedIds, analystIds]);
  const selectedEngineerDone = useMemo(() => selectedCompletedIds.filter((uid) => engineerIds.has(uid)).length, [selectedCompletedIds, engineerIds]);
  const selectedAvgExamScore = useMemo(() => {
    if (!selectedMetrics?.mockExamHistory.length) return 0;
    const sum = selectedMetrics.mockExamHistory.reduce((acc, exam) => acc + Number(exam.score || 0), 0);
    return toOneDecimal(sum / selectedMetrics.mockExamHistory.length);
  }, [selectedMetrics]);
  const selectedCorrectRate = useMemo(() => {
    const total = selectedMetrics?.attemptEvents.length || 0;
    if (!total) return 0;
    const correct = selectedMetrics?.attemptEvents.filter((evt) => evt.correct).length || 0;
    return toOneDecimal((correct / total) * 100);
  }, [selectedMetrics]);
  const selectedLastActive = useMemo(
    () => (selectedMetrics ? getLastActiveAt(selectedMetrics.attemptEvents, selectedMetrics.mockExamHistory, selectedMetrics.completedMeta) : null),
    [selectedMetrics],
  );

  const learningTrendData = useMemo(
    () => buildLearningTrendFromCompletedMeta({
      completedMeta: selectedMetrics?.completedMeta || {},
      analystIds,
      engineerIds,
      nowTs: Date.now(),
      dayLabels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    }),
    [selectedMetrics, analystIds, engineerIds],
  );

  const accuracyTrendData = useMemo(() => {
    if (!selectedMetrics) return [];
    const now = Date.now();
    const thisWeekStart = getWeekStartMonday(now);
    const dayMs = 24 * 60 * 60 * 1000;
    return Array.from({ length: 4 }).map((_, idx) => {
      const i = 3 - idx;
      const start = thisWeekStart - i * 7 * dayMs;
      const end = start + 7 * dayMs;
      const weekDate = new Date(start);
      const month = weekDate.getMonth() + 1;
      const firstDayOfMonth = new Date(weekDate.getFullYear(), weekDate.getMonth(), 1);
      const weekOfMonth = Math.ceil((weekDate.getDate() + firstDayOfMonth.getDay()) / 7);
      let total = 0;
      let correct = 0;
      selectedMetrics.attemptEvents.forEach((evt) => {
        const ts = Date.parse(evt.at);
        if (!Number.isNaN(ts) && ts >= start && ts < end) {
          total += 1;
          if (evt.correct) correct += 1;
        }
      });
      return { week: `${month}月W${weekOfMonth}`, rate: total ? toOneDecimal((correct / total) * 100) : 0 };
    });
  }, [selectedMetrics]);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return studentMetrics;
    return studentMetrics.filter((item) => [item.profile.name, item.profile.email, item.profile.id].some((value) => (value || '').toLowerCase().includes(keyword)));
  }, [studentMetrics, query]);

  const saveExamConfig = async () => {
    if (!user || cloudState.blocked) return;
    try {
      await setJson('db_admin:exam_config', examConfig);
      await appendAudit('考试配置更新', JSON.stringify(examConfig));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const exportReport = async () => {
    const payload = { exportedAt: new Date().toISOString(), overviewStats, questionStats, profiles, examConfig };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await appendAudit('报表导出', '导出管理后台概览与配置数据');
  };

  const handleToggleDelete = async () => {
    if (!confirmState || !user || cloudState.blocked) return;
    const nextDeleted = confirmState.type === 'delete';
    if (nextDeleted && confirmState.profile.id === user.id) {
      setError('不能停用当前登录管理员。');
      setConfirmState(null);
      return;
    }

    setPendingDelete(true);
    try {
      const nextProfile: UserProfile = {
        ...confirmState.profile,
        status: nextDeleted ? 'deleted' : 'active',
        is_deleted: nextDeleted,
        deleted_at: nextDeleted ? new Date().toISOString() : null,
        deleted_by: nextDeleted ? user.id : null,
      };
      await setJson(`db_profile:${confirmState.profile.id}`, nextProfile);
      await setJson(`profile:${confirmState.profile.id}`, nextProfile);
      setProfiles((prev) => prev.map((item) => (item.id === confirmState.profile.id ? nextProfile : item)));
      setAllMetrics((prev) => prev.map((item) => (item.profile.id === confirmState.profile.id ? { ...item, profile: nextProfile } : item)));
      await appendAudit(nextDeleted ? '停用用户' : '恢复用户', getDisplayUserName(confirmState.profile));
      setConfirmState(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPendingDelete(false);
    }
  };  if (!user) {
    return (
      <GateCard title="请先登录" description="管理后台仅对管理员开放。" icon={<ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-500" />}>
        <Link to="/login" className="inline-flex rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700">去登录</Link>
      </GateCard>
    );
  }

  if (user.role !== 'admin') {
    return <GateCard title="无权限访问" description="当前账号不是管理员。" icon={<ShieldAlert className="mx-auto mb-3 h-10 w-10 text-red-500" />} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
          <p className="mt-1 text-gray-600">学员总览、用户管理、配置维护与审计。</p>
        </div>
        <button onClick={() => void loadAdminData()} disabled={loading || cloudState.blocked} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:bg-gray-400">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
      </div>

      {cloudState.blocked ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{cloudState.message || '云端连接不可用，请稍后重试。'}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2">
        <TabButton current={tab} value="overview" setTab={setTab} label="概览" />
        <TabButton current={tab} value="users" setTab={setTab} label="用户管理" />
        <TabButton current={tab} value="questionBank" setTab={setTab} label="题库管理" />
        <TabButton current={tab} value="examConfig" setTab={setTab} label="考试配置" />
        <TabButton current={tab} value="report" setTab={setTab} label="报表导出" />
        <TabButton current={tab} value="audit" setTab={setTab} label="审计日志" />
      </div>

      {tab === 'overview' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard title="活跃学员" value={overviewStats.totalStudents} hint="未删除的学员/讲师" icon={<Users className="h-4 w-4" />} />
            <SummaryCard title="7日活跃学员" value={overviewStats.activeUsers7d} hint="近 7 天有练习行为" />
            <SummaryCard title="练习正确率" value={`${overviewStats.practiceAccuracy}%`} hint="全体活跃学员" />
            <SummaryCard title="模拟考试均分" value={`${overviewStats.averageExamScore}%`} hint={`累计 ${overviewStats.totalExamAttempts} 次考试记录`} />
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2">
            <SubTabButton current={overviewTab} value="overall" setTab={setOverviewTab} label="整体学习情况" />
            <SubTabButton current={overviewTab} value="student" setTab={setOverviewTab} label="学员详情" />
          </div>
          {overviewTab === 'overall' ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex min-h-[52px] items-start justify-between gap-3">
                  <div className="min-h-[52px] min-w-0 flex-1 pr-3"><h3 className="text-base font-semibold text-gray-900">近 4 周整体活跃趋势</h3><p className="text-xs text-gray-500">按周查看活跃学员数和模拟考试次数。</p></div>
                  <div className="ml-2 flex flex-col items-start gap-1 whitespace-nowrap text-xs text-gray-600"><LegendChip label="活跃学员数" color={ANALYST_COLOR} /><LegendChip label="模拟考试次数" color={EXAM_COLOR} /></div>
                </div>
                <ResponsiveContainer width="100%" height={240}><LineChart data={overallActivityTrend} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" /><XAxis dataKey="week" tick={{ fontSize: 12 }} padding={{ left: 20, right: 20 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={34} /><Tooltip /><Line type="monotone" dataKey="activeCount" stroke={ANALYST_COLOR} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="活跃学员数" /><Line type="monotone" dataKey="examCount" stroke={EXAM_COLOR} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="模拟考试次数" /></LineChart></ResponsiveContainer>
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex min-h-[52px] items-start justify-between gap-3">
                  <div className="min-h-[52px] min-w-0 flex-1 pr-3"><h3 className="text-base font-semibold text-gray-900">题目完成分布</h3><p className="text-xs text-gray-500">可区间查看 Analyst/Engineer 完成学员。</p></div>
                  <div className="ml-2 flex flex-col items-start gap-1 whitespace-nowrap text-xs text-gray-600"><LegendChip label="Data Analyst" color={ANALYST_COLOR} /><LegendChip label="Data Engineer" color={ENGINEER_COLOR} /></div>
                </div>
                <ResponsiveContainer width="100%" height={240}><BarChart data={overallProgressDistribution} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} barCategoryGap="18%"><CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={34} /><Tooltip content={<ProgressDistributionTooltip />} /><Bar dataKey="analyst" name="Data Analyst" fill={ANALYST_COLOR} radius={[8, 8, 0, 0]} maxBarSize={42} /><Bar dataKey="engineer" name="Data Engineer" fill={ENGINEER_COLOR} radius={[8, 8, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer>
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-gray-900">学习方向分布</h3><div className="flex flex-wrap gap-3 text-xs text-gray-600"><LegendChip label="Data Analyst" color={ANALYST_COLOR} /><LegendChip label="Data Engineer" color={ENGINEER_COLOR} /></div></div>
                <div className="grid grid-cols-[160px_1fr] items-center gap-2"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={overallTrackShare} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>{overallTrackShare.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="space-y-3">{overallTrackShare.map((item) => <div key={item.name} className="rounded-xl bg-gray-50 px-3 py-2"><div className="flex items-center gap-2 text-sm font-medium text-gray-900"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</div><div className="mt-1 text-xs text-gray-500">{item.value} 人</div></div>)}</div></div>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-4"><div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h3 className="text-base font-semibold text-gray-900">学员详情</h3><p className="mt-1 text-xs text-gray-500">通过下拉框切换查看某位学员的学习数据与趋势。</p></div><div className="w-full lg:max-w-xs"><label className="mb-1 block text-xs font-medium text-gray-600">选择学员</label><select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">{activeStudentMetrics.length === 0 ? <option value="">暂无可选学员</option> : null}{activeStudentMetrics.map((item) => <option key={item.profile.id} value={item.profile.id}>{getDisplayUserName(item.profile)}</option>)}</select></div></div>{selectedMetrics ? <div className="grid grid-cols-2 gap-3 xl:grid-cols-6"><MiniStat title="Data Analyst" value={`${pct(selectedAnalystDone, analystIds.size)}%`} /><MiniStat title="Data Engineer" value={`${pct(selectedEngineerDone, engineerIds.size)}%`} /><MiniStat title="练习正确率" value={`${selectedCorrectRate}%`} /><MiniStat title="模拟考试均分" value={`${selectedAvgExamScore}%`} /><MiniStat title="模块完成数" value={Object.keys(selectedMetrics.moduleCompleteMeta).length} /><MiniStat title="最后活跃时间" value={<span className="text-sm font-semibold">{formatDateTime(selectedLastActive)}</span>} /></div> : <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">暂无可展示的学员详情。</div>}</section>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><section className="rounded-2xl border border-gray-200 bg-white p-4"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-gray-900">学习趋势</h3><div className="flex flex-wrap gap-3 text-xs text-gray-600"><LegendChip label="Data Analyst" color={ANALYST_COLOR} /><LegendChip label="Data Engineer" color={ENGINEER_COLOR} /></div></div><ResponsiveContainer width="100%" height={220}><LineChart data={learningTrendData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" /><XAxis dataKey="date" tick={{ fontSize: 12 }} padding={{ left: 20, right: 20 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /><Tooltip /><Line type="monotone" dataKey="analyst" stroke={ANALYST_COLOR} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Data Analyst" connectNulls={false} /><Line type="monotone" dataKey="engineer" stroke={ENGINEER_COLOR} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Data Engineer" connectNulls={false} /></LineChart></ResponsiveContainer></section><section className="rounded-2xl border border-gray-200 bg-white p-4"><h3 className="mb-3 text-base font-semibold text-gray-900">正确率趋势</h3><ResponsiveContainer width="100%" height={220}><BarChart data={accuracyTrendData} barCategoryGap="8%" margin={{ top: 8, right: 12, left: 0, bottom: 8 }}><defs><linearGradient id="adminAccuracyBarGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c" stopOpacity={0.95} /><stop offset="100%" stopColor="#f97316" stopOpacity={0.75} /></linearGradient></defs><CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" /><XAxis dataKey="week" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="rate" fill="url(#adminAccuracyBarGradient)" name="正确率(%)" radius={[10, 10, 0, 0]} barSize={56} maxBarSize={64}>{accuracyTrendData.map((entry, index) => <Cell key={`admin-acc-${entry.week}-${index}`} fillOpacity={entry.rate >= 80 ? 1 : entry.rate >= 60 ? 0.9 : 0.78} />)}</Bar></BarChart></ResponsiveContainer></section></div>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'users' ? <div className="rounded-xl border border-gray-200 bg-white p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h3 className="text-lg font-semibold text-gray-900">用户管理</h3><p className="mt-1 text-sm text-gray-500">支持搜索、查看状态，以及对学员/讲师做停用与恢复。</p></div><input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm lg:max-w-sm" placeholder="搜索姓名 / 邮箱 / ID" /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-gray-500"><tr className="border-b border-gray-200"><th className="py-3">用户</th><th className="py-3">角色</th><th className="py-3">状态</th><th className="py-3">最后活跃</th><th className="py-3">操作</th></tr></thead><tbody>{filteredUsers.map((item) => { const deleted = isDeletedProfile(item.profile); return <tr key={item.profile.id} className="border-b border-gray-100 align-top"><td className="py-4"><div className="font-medium text-gray-900">{item.profile.name || '未命名用户'}</div><div className="text-gray-500">{item.profile.email || '无邮箱'}</div><div className="text-xs text-gray-400">{item.profile.id}</div></td><td className="py-4">{item.profile.role === 'instructor' ? '讲师' : '学员'}</td><td className="py-4"><span className={`rounded-full px-2 py-1 text-xs ${deleted ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{deleted ? '已停用' : '正常'}</span></td><td className="py-4 text-gray-500">{formatDateTime(getLastActiveAt(item.attemptEvents, item.mockExamHistory, item.completedMeta))}</td><td className="py-4"><button onClick={() => setConfirmState({ type: deleted ? 'restore' : 'delete', profile: item.profile })} className={`rounded-lg px-3 py-2 text-sm ${deleted ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>{deleted ? '恢复' : '停用'}</button></td></tr>; })}{filteredUsers.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">没有匹配的用户。</td></tr> : null}</tbody></table></div></div> : null}

      {tab === 'questionBank' ? <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900">题库管理</h3><p className="mt-1 text-sm text-gray-500">题库结构统计固定读取本地 questions.json，不受云端空数据影响。</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"><MiniStat title="总题量" value={questionStats.total} /><MiniStat title="图片题" value={questionStats.imageQuestions} /><MiniStat title="Data Analyst" value={questionStats.analyst} /><MiniStat title="Data Engineer" value={questionStats.engineer} /></div></div> : null}
      {tab === 'examConfig' ? <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900">考试配置</h3><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"><Field label="时长(分钟)" value={examConfig.durationMinutes} onChange={(v) => setExamConfigState((prev) => ({ ...prev, durationMinutes: Math.max(30, Number(v) || 90) }))} /><Field label="题目数量" value={examConfig.questionCount} onChange={(v) => setExamConfigState((prev) => ({ ...prev, questionCount: Math.max(10, Number(v) || 45) }))} /><Field label="及格分数" value={examConfig.passingScore} onChange={(v) => setExamConfigState((prev) => ({ ...prev, passingScore: Math.min(100, Math.max(0, Number(v) || 70)) }))} /></div><button onClick={() => void saveExamConfig()} disabled={cloudState.blocked} className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:bg-gray-400">保存配置</button></div> : null}
      {tab === 'report' ? <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900">报表导出</h3><p className="mt-1 text-sm text-gray-600">导出当前概览、题库统计、用户列表与考试配置。</p><button onClick={() => void exportReport()} disabled={cloudState.blocked} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:bg-gray-400"><Download className="h-4 w-4" />导出 JSON 报表</button></div> : null}
      {tab === 'audit' ? <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="mb-4 text-lg font-semibold text-gray-900">审计日志</h3>{auditLogs.length === 0 ? <p className="text-sm text-gray-500">暂无审计日志。</p> : <div className="space-y-2">{auditLogs.map((log, idx) => <div key={`${log.at}_${idx}`} className="rounded-xl border border-gray-200 p-3 text-sm"><div className="font-medium text-gray-900">{log.action}</div><div className="text-gray-600">{log.detail}</div><div className="mt-1 text-xs text-gray-500">{formatDateTime(log.at)} · {log.actor}</div></div>)}</div>}</div> : null}

      <ConfirmActionDialog open={Boolean(confirmState)} title={confirmState?.type === 'delete' ? '停用用户' : '恢复用户'} description={confirmState ? `${confirmState.type === 'delete' ? '确认停用' : '确认恢复'} ${getDisplayUserName(confirmState.profile)} 吗？` : ''} confirmText={confirmState?.type === 'delete' ? '停用' : '恢复'} cancelText="取消" destructive={confirmState?.type === 'delete'} pending={pendingDelete} onOpenChange={(open) => { if (!open) setConfirmState(null); }} onConfirm={handleToggleDelete} />
    </div>
  );
}

function GateCard({ title, description, icon, children }: { title: string; description: string; icon: ReactNode; children?: ReactNode }) {
  return <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-gray-200 bg-white p-8 text-center">{icon}<h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1><p className="mb-6 text-gray-600">{description}</p>{children}</div>;
}

function TabButton({ current, value, setTab, label }: { current: AdminTab; value: AdminTab; setTab: (v: AdminTab) => void; label: string }) {
  const active = current === value;
  return <button onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{label}</button>;
}

function SubTabButton({ current, value, setTab, label }: { current: OverviewTab; value: OverviewTab; setTab: (v: OverviewTab) => void; label: string }) {
  const active = current === value;
  return <button onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{label}</button>;
}

function SummaryCard({ title, value, hint, icon }: { title: string; value: string | number; hint: string; icon?: ReactNode }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><div className="text-sm font-medium text-gray-600">{title}</div>{icon ? <div className="text-gray-400">{icon}</div> : null}</div><div className="mt-3 text-3xl font-bold text-gray-900">{value}</div><div className="mt-2 text-xs text-gray-500">{hint}</div></div>;
}

function MiniStat({ title, value }: { title: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function LegendChip({ label, color }: { label: string; color: string }) {
  return <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span>{label}</span></div>;
}

function ProgressDistributionTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: ProgressDistributionDatum }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  return <div className="max-w-[320px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg"><div className="mb-2 font-medium text-slate-900">{label}</div><div className="space-y-2"><div><div className="mb-1 flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ANALYST_COLOR }} /><span>Data Analyst: {datum.analyst} 人</span></div><div className="text-slate-500">{datum.analystUsers.length ? datum.analystUsers.join('、') : '无'}</div></div><div><div className="mb-1 flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ENGINEER_COLOR }} /><span>Data Engineer: {datum.engineer} 人</span></div><div className="text-slate-500">{datum.engineerUsers.length ? datum.engineerUsers.join('、') : '无'}</div></div></div></div>;
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return <label className="block"><span className="text-sm text-gray-600">{label}</span><input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>;
}
