import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { getJson, listJsonByPrefix, setJson } from '../../lib/supabaseClient';
import { questions } from '../data/mockData';

type AdminTab = 'overview' | 'users' | 'questionBank' | 'examConfig' | 'report' | 'audit';

type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
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

type AdminStats = {
  totalUsers: number;
  activeUsers7d: number;
  totalCompletedQuestions: number;
  practiceAccuracy: number;
  totalExamAttempts: number;
  averageExamScore: number;
  practiceAttemptTotal: number;
};

const DEFAULT_EXAM_CONFIG: ExamConfig = {
  durationMinutes: 90,
  questionCount: 45,
  passingScore: 70,
};

function isImageOpt(v: string) {
  return typeof v === 'string' && v.startsWith('data:image');
}

export default function Admin() {
  const { user, cloudState } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [examConfig, setExamConfigState] = useState<ExamConfig>(DEFAULT_EXAM_CONFIG);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers7d: 0,
    totalCompletedQuestions: 0,
    practiceAccuracy: 0,
    totalExamAttempts: 0,
    averageExamScore: 0,
    practiceAttemptTotal: 0,
  });

  const questionStats = useMemo(() => {
    const total = questions.length;
    const imageQuestions = questions.filter((q) => Boolean(q.img) || q.opts.some((opt) => isImageOpt(opt))).length;
    const analyst = questions.filter((q) => q.category === 'Data Analyst').length;
    const engineer = questions.filter((q) => q.category === 'Data Engineer').length;
    return { total, imageQuestions, analyst, engineer };
  }, []);

  const appendAudit = async (action: string, detail: string) => {
    if (!user || cloudState.blocked) return;
    const next: AuditLog[] = [
      {
        at: new Date().toISOString(),
        actor: `${user.name}(${user.email})`,
        action,
        detail,
      },
      ...auditLogs,
    ].slice(0, 200);
    setAuditLogs(next);
    await setJson<AuditLog[]>('db_admin:audit_logs', next);
  };

  const loadAdminData = async () => {
    if (!user || cloudState.blocked) return;
    setLoading(true);
    setError('');
    try {
      const [profileItems, completedItems, attemptItems, examItems, cfg, logs] = await Promise.all([
        listJsonByPrefix<UserProfile>('profile:'),
        listJsonByPrefix<string[]>('completed:'),
        listJsonByPrefix<Array<{ uid: string; correct: boolean; at: string }>>('db_progress:attempt_events:'),
        listJsonByPrefix<Array<{ score: number; submittedAt?: string; date?: string }>>('db_mock_exam_history:'),
        getJson<ExamConfig>('db_admin:exam_config', DEFAULT_EXAM_CONFIG),
        getJson<AuditLog[]>('db_admin:audit_logs', []),
      ]);

      const profileList = profileItems.map((x) => x.value).filter(Boolean);
      setProfiles(profileList);
      setExamConfigState(cfg);
      setAuditLogs(Array.isArray(logs) ? logs : []);

      const totalUsers = profileList.length;
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      let activeUsers7d = 0;
      let totalCompletedQuestions = 0;
      let practiceCorrect = 0;
      let practiceTotal = 0;
      let totalExamAttempts = 0;
      let examScoreSum = 0;

      const attemptsByUser = new Map<string, Array<{ uid: string; correct: boolean; at: string }>>();
      attemptItems.forEach((row) => attemptsByUser.set(row.key, row.value || []));
      const examsByUser = new Map<string, Array<{ score: number; submittedAt?: string; date?: string }>>();
      examItems.forEach((row) => examsByUser.set(row.key, row.value || []));

      profileList.forEach((p) => {
        const completed = completedItems.find((it) => it.key === `completed:${p.id}`)?.value || [];
        totalCompletedQuestions += Array.isArray(completed) ? completed.length : 0;

        const attemptKey = `db_progress:attempt_events:${p.id}`;
        const attempts = attemptsByUser.get(attemptKey) || [];
        if (attempts.some((a) => Date.parse(a.at) >= sevenDaysAgo)) activeUsers7d += 1;
        attempts.forEach((a) => {
          practiceTotal += 1;
          if (a.correct) practiceCorrect += 1;
        });

        const examKey = `db_mock_exam_history:${p.id}`;
        const exams = examsByUser.get(examKey) || [];
        exams.forEach((e) => {
          totalExamAttempts += 1;
          examScoreSum += Number(e.score || 0);
        });
      });

      setStats({
        totalUsers,
        activeUsers7d,
        totalCompletedQuestions,
        practiceAccuracy: practiceTotal > 0 ? Number(((practiceCorrect / practiceTotal) * 100).toFixed(1)) : 0,
        totalExamAttempts,
        averageExamScore: totalExamAttempts > 0 ? Number((examScoreSum / totalExamAttempts).toFixed(1)) : 0,
        practiceAttemptTotal: practiceTotal,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, [user?.id, cloudState.blocked]);

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
    const payload = {
      exportedAt: new Date().toISOString(),
      stats,
      questionStats,
      profiles,
      examConfig,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await appendAudit('报表导出', '导出平台统计报表');
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto mt-10 bg-white border border-gray-200 rounded-xl p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">请先登录</h1>
        <p className="text-gray-600 mb-6">管理后台仅对管理员开放。</p>
        <Link to="/login" className="inline-flex px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700">
          去登录
        </Link>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto mt-10 bg-white border border-gray-200 rounded-xl p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">无权限访问</h1>
        <p className="text-gray-600">当前账号不是管理员。</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
          <p className="text-gray-600 mt-1">平台数据统计与管理</p>
        </div>
        <button
          onClick={() => void loadAdminData()}
          disabled={loading || cloudState.blocked}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg disabled:bg-gray-400"
        >
          <RefreshCw className="w-4 h-4" />
          刷新数据
        </button>
      </div>

      {cloudState.blocked && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">
          云端连接异常：{cloudState.message || '当前为严格一致模式，管理后台读写已阻断。'}
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-wrap gap-2">
        <TabButton current={tab} value="overview" setTab={setTab} label="概览" />
        <TabButton current={tab} value="users" setTab={setTab} label="用户管理" />
        <TabButton current={tab} value="questionBank" setTab={setTab} label="题库管理" />
        <TabButton current={tab} value="examConfig" setTab={setTab} label="考试配置" />
        <TabButton current={tab} value="report" setTab={setTab} label="报表导出" />
        <TabButton current={tab} value="audit" setTab={setTab} label="审计日志" />
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="总用户数" value={stats.totalUsers} />
          <StatCard title="7日活跃用户" value={stats.activeUsers7d} />
          <StatCard title="总完成题数" value={stats.totalCompletedQuestions} />
          <StatCard title="练习正确率" value={`${stats.practiceAccuracy}%`} />
          <StatCard title="总考试次数" value={stats.totalExamAttempts} />
          <StatCard title="平均分" value={`${stats.averageExamScore}%`} />
          <StatCard title="练习作答总次数" value={stats.practiceAttemptTotal} />
          <StatCard title="题库总量(本地)" value={questionStats.total} />
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">用户管理</h3>
          {profiles.length === 0 ? (
            <p className="text-sm text-gray-500">暂无用户数据。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="text-left py-2">姓名</th>
                    <th className="text-left py-2">邮箱</th>
                    <th className="text-left py-2">角色</th>
                    <th className="text-left py-2">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100">
                      <td className="py-2">{p.name}</td>
                      <td className="py-2">{p.email}</td>
                      <td className="py-2">{p.role === 'admin' ? '管理员' : '普通用户'}</td>
                      <td className="py-2 text-gray-500">{p.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'questionBank' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">题库管理</h3>
          <p className="text-sm text-gray-500">题库结构统计固定读取本地 questions.json，不受云端空数据影响。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="总题量" value={questionStats.total} />
            <StatCard title="图片题" value={questionStats.imageQuestions} />
            <StatCard title="分析师题量" value={questionStats.analyst} />
            <StatCard title="工程师题量" value={questionStats.engineer} />
          </div>
        </div>
      )}

      {tab === 'examConfig' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">考试配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="时长(分钟)"
              value={examConfig.durationMinutes}
              onChange={(v) => setExamConfigState((prev) => ({ ...prev, durationMinutes: Math.max(30, Number(v) || 90) }))}
            />
            <Field
              label="题目数量"
              value={examConfig.questionCount}
              onChange={(v) => setExamConfigState((prev) => ({ ...prev, questionCount: Math.max(10, Number(v) || 45) }))}
            />
            <Field
              label="及格分数"
              value={examConfig.passingScore}
              onChange={(v) => setExamConfigState((prev) => ({ ...prev, passingScore: Math.min(100, Math.max(0, Number(v) || 70)) }))}
            />
          </div>
          <button
            onClick={() => void saveExamConfig()}
            disabled={cloudState.blocked}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
          >
            保存配置
          </button>
        </div>
      )}

      {tab === 'report' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">报表导出</h3>
          <p className="text-sm text-gray-600">导出当前平台概览、题库统计、用户列表与考试配置。</p>
          <button
            onClick={() => void exportReport()}
            disabled={cloudState.blocked}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
          >
            <Download className="w-4 h-4" />
            导出 JSON 报表
          </button>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">审计日志</h3>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500">暂无审计日志。</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log, idx) => (
                <div key={`${log.at}_${idx}`} className="rounded border border-gray-200 p-3 text-sm">
                  <div className="text-gray-900 font-medium">{log.action}</div>
                  <div className="text-gray-600">{log.detail}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(log.at).toLocaleString()} · {log.actor}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  current,
  value,
  setTab,
  label,
}: {
  current: AdminTab;
  value: AdminTab;
  setTab: (v: AdminTab) => void;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => setTab(value)}
      className={`px-3 py-2 rounded-lg text-sm ${active ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
    >
      {label}
    </button>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
      />
    </label>
  );
}
