import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Play, Trophy } from 'lucide-react';
import { questions } from '../data/mockData';
import { useApp } from '../../context/AppContext';
import { getJson, setJson } from '../../lib/supabaseClient';

type ExamState = 'selection' | 'in-progress' | 'results';
type ExamTrack = 'analyst' | 'engineer';

type ExamHistoryItem = {
  id: string;
  date: string;
  score: number;
  totalQuestions: number;
  track: ExamTrack;
  duration: string;
};

type ExamQuestion = (typeof questions)[number];

type WrongQuestion = {
  uid: string;
  q: string;
  q_zh?: string;
  opts: string[];
  correct: string;
  selected?: string[];
  exp_zh?: string;
  exp_link?: string;
  img?: string | string[];
};

type WeaknessItem = {
  topic: string;
  total: number;
  wrong: number;
  accuracy: number;
};

type ExamResult = {
  score: number;
  totalQuestions: number;
  correctCount: number;
  duration: string;
  wrongQuestions: WrongQuestion[];
  weaknesses: WeaknessItem[];
};

const EXAM_TOTAL = 45;
const EXAM_SECONDS = 90 * 60;
const REQUIRE_MULTI_CHOICE_SELECTION = true;

function shuffle<T>(arr: T[]) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function parseAnswerLabels(ans?: string) {
  return (ans || '')
    .toUpperCase()
    .split('')
    .filter((ch) => ch >= 'A' && ch <= 'Z');
}

function isImageValue(v: string) {
  return v.startsWith('data:image') || /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(v);
}

function normalizeTrackPool(track: ExamTrack): ExamQuestion[] {
  const byTrack = questions.filter((q) => {
    const cat = (q.category || '').toLowerCase();
    if (track === 'analyst') return cat.includes('analyst') || q.uid.startsWith('da_');
    return cat.includes('engineer') || q.uid.startsWith('de_');
  });

  if (byTrack.length >= EXAM_TOTAL) return byTrack;
  return questions;
}

function normalizeImgs(img?: string | string[]) {
  if (!img) return [] as string[];
  return Array.isArray(img) ? img : [img];
}

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MockExam() {
  const { user, cloudState } = useApp();
  const [examState, setExamState] = useState<ExamState>('selection');
  const [selectedTrack, setSelectedTrack] = useState<ExamTrack>('analyst');
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [sessionId, setSessionId] = useState(0);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);

  const historyKey = user ? `db_mock_exam_history:${user.id}` : '';

  useEffect(() => {
    if (!user || cloudState.blocked) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const remote = await getJson<ExamHistoryItem[]>(historyKey, []);
        if (!cancelled) setHistory(Array.isArray(remote) ? remote : []);
      } catch {
        if (!cancelled) setHistory([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, cloudState.blocked, historyKey]);

  const startExam = () => {
    setLastResult(null);
    setSessionId((v) => v + 1);
    setExamState('in-progress');
  };

  const finishExam = async (result: ExamResult) => {
    setLastResult(result);
    setExamState('results');

    if (!user || cloudState.blocked) return;

    const record: ExamHistoryItem = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      score: result.score,
      totalQuestions: result.totalQuestions,
      track: selectedTrack,
      duration: result.duration,
    };

    const next = [record, ...history];
    setHistory(next);
    try {
      await setJson(historyKey, next);
    } catch {
      // keep local UI even if cloud write fails
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-4 space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">模拟考试</h1>
        <p className="text-slate-600 mt-1">考试历史使用云端同步，确保不同设备下一致。</p>
      </div>

      {examState === 'selection' && (
        <ExamSelection
          selectedTrack={selectedTrack}
          setSelectedTrack={setSelectedTrack}
          onStart={startExam}
          history={history}
        />
      )}

      {examState === 'in-progress' && (
        <ExamInProgress
          key={`${selectedTrack}-${sessionId}`}
          track={selectedTrack}
          onFinish={finishExam}
          onBackMenu={() => setExamState('selection')}
        />
      )}

      {examState === 'results' && (
        <ExamResults
          track={selectedTrack}
          result={lastResult}
          onBackMenu={() => setExamState('selection')}
          onRetry={startExam}
        />
      )}
    </div>
  );
}

function ExamSelection({
  selectedTrack,
  setSelectedTrack,
  onStart,
  history,
}: {
  selectedTrack: ExamTrack;
  setSelectedTrack: (track: ExamTrack) => void;
  onStart: () => void;
  history: ExamHistoryItem[];
}) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setSelectedTrack('analyst')}
          className={`text-left p-6 rounded-xl border-2 transition-all ${
            selectedTrack === 'analyst'
              ? 'bg-orange-50 border-orange-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <h3 className="text-xl font-bold text-slate-900 mb-2">Data Analyst Associate</h3>
          <div className="space-y-1 text-sm text-slate-600">
            <p>90 分钟 / 45 题</p>
            <p>及格分数：70%</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedTrack('engineer')}
          className={`text-left p-6 rounded-xl border-2 transition-all ${
            selectedTrack === 'engineer'
              ? 'bg-orange-50 border-orange-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <h3 className="text-xl font-bold text-slate-900 mb-2">Data Engineer Associate</h3>
          <div className="space-y-1 text-sm text-slate-600">
            <p>90 分钟 / 45 题</p>
            <p>及格分数：70%</p>
          </div>
        </button>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900 mb-2">考试说明</h3>
            <ul className="space-y-1 text-sm text-amber-800">
              <li>• 考试开始后立即倒计时。</li>
              <li>• 可通过右侧进度面板点击跳题。</li>
              <li>• 提交后给出真实得分、薄弱知识点和错题列表。</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onStart}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-[#1b3139] hover:bg-slate-700 text-white rounded-xl text-lg font-bold transition-colors"
        >
          <Play className="w-6 h-6" />
          开始考试
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">考试历史（云端）</h3>
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-sm text-slate-500">暂无历史记录</div>
          ) : (
            history.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {exam.track === 'analyst' ? 'Data Analyst Associate' : 'Data Engineer Associate'}
                    </div>
                    <div className="text-sm text-slate-600">{formatDate(exam.date)} · {exam.duration}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${exam.score >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {exam.score}%
                  </div>
                  <div className="text-sm text-slate-600">{exam.totalQuestions} 题</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function ExamInProgress({
  track,
  onFinish,
  onBackMenu,
}: {
  track: ExamTrack;
  onFinish: (result: ExamResult) => void;
  onBackMenu: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_SECONDS);
  const [submitError, setSubmitError] = useState('');

  const answersRef = useRef<Record<number, string[]>>({});
  const questionsRef = useRef<ExamQuestion[]>([]);

  const examQuestions = useMemo(() => {
    const pool = normalizeTrackPool(track);
    return shuffle(pool).slice(0, EXAM_TOTAL);
  }, [track]);

  useEffect(() => {
    questionsRef.current = examQuestions;
  }, [examQuestions]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const currentQuestion = examQuestions[currentIndex];
  const answeredCount = Object.values(answers).filter((arr) => Array.isArray(arr) && arr.length > 0).length;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const currentIsMultiChoice = parseAnswerLabels(currentQuestion.ans).length > 1;

  const buildResult = (finalAnswers: Record<number, string[]>, finalTimeLeft: number): ExamResult => {
    const wrongQuestions: WrongQuestion[] = [];
    const weaknessMap = new Map<string, { total: number; wrong: number }>();

    let correctCount = 0;

    examQuestions.forEach((q, idx) => {
      const topic = q.category || '其他';
      const stat = weaknessMap.get(topic) ?? { total: 0, wrong: 0 };
      stat.total += 1;

      const selected = finalAnswers[idx] || [];
      const expected = new Set(parseAnswerLabels(q.ans));
      const selectedSet = new Set(selected);
      const isCorrect =
        expected.size === selectedSet.size && [...expected].every((label) => selectedSet.has(label));
      if (isCorrect) {
        correctCount += 1;
      } else {
        stat.wrong += 1;
        wrongQuestions.push({
          uid: q.uid,
          q: q.q,
          q_zh: q.q_zh,
          opts: q.opts,
          correct: q.ans,
          selected,
          exp_zh: q.exp_zh,
          exp_link: q.exp_link,
          img: q.img,
        });
      }

      weaknessMap.set(topic, stat);
    });

    const weaknesses: WeaknessItem[] = Array.from(weaknessMap.entries())
      .map(([topic, stat]) => ({
        topic,
        total: stat.total,
        wrong: stat.wrong,
        accuracy: Number((((stat.total - stat.wrong) / stat.total) * 100).toFixed(1)),
      }))
      .sort((a, b) => {
        const gap = a.accuracy - b.accuracy;
        if (gap !== 0) return gap;
        return b.total - a.total;
      });

    const score = Number(((correctCount / EXAM_TOTAL) * 100).toFixed(1));
    const usedMinutes = Math.max(1, Math.floor((EXAM_SECONDS - finalTimeLeft) / 60));

    return {
      score,
      totalQuestions: EXAM_TOTAL,
      correctCount,
      duration: `${usedMinutes} 分钟`,
      wrongQuestions,
      weaknesses,
    };
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const result = buildResult(answersRef.current, 0);
          onFinish(result);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const submit = () => {
    if (REQUIRE_MULTI_CHOICE_SELECTION) {
      const missingIdx = examQuestions.findIndex(
        (q, idx) => parseAnswerLabels(q.ans).length > 1 && (!answers[idx] || answers[idx].length === 0),
      );
      if (missingIdx >= 0) {
        setCurrentIndex(missingIdx);
        setSidebarOpen(true);
        setSubmitError(`第 ${missingIdx + 1} 题为多选题，请至少选择 1 项后再提交。`);
        return;
      }
    }
    setSubmitError('');
    const result = buildResult(answers, timeLeft);
    onFinish(result);
  };

  if (!currentQuestion) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-600">
        题库不足，无法生成考试。
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="px-3 py-2 bg-[#1b3139] hover:bg-slate-700 text-white rounded text-xs font-bold transition-all"
          >
            进度面板
          </button>
          <button
            onClick={onBackMenu}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
          >
            菜单
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Clock className="w-4 h-4 text-orange-500" />
          <span className={`text-lg font-bold ${timeLeft < 600 ? 'text-red-600' : 'text-slate-900'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-2 w-full bg-slate-100">
          <div className="h-full bg-[#FF3621] transition-all" style={{ width: `${((currentIndex + 1) / EXAM_TOTAL) * 100}%` }} />
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl font-black text-[#1b3139]">{currentIndex + 1}</span>
              <span className="text-slate-400 text-lg font-bold">/ {EXAM_TOTAL}</span>
              <span className="ml-auto text-xs text-slate-500">已答：{answeredCount} / {EXAM_TOTAL}</span>
            </div>

            <h2 className="text-lg font-bold text-slate-800 leading-snug mb-4">{currentQuestion.q}</h2>
            {currentIsMultiChoice ? (
              <div className="mb-3 inline-flex items-center rounded bg-orange-50 text-orange-700 text-xs font-semibold px-2 py-1">
                多选题（可选择多个答案）
              </div>
            ) : null}

            {normalizeImgs(currentQuestion.img).length > 0 ? (
              <div className="mb-4 space-y-3">
                {normalizeImgs(currentQuestion.img).map((src, i) => (
                  <img key={`${currentQuestion.uid}_img_${i}`} src={src} alt={`question-${i + 1}`} className="w-full rounded-lg border border-slate-200" />
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            {currentQuestion.opts.map((opt, i) => {
              const label = optionLabel(i);
              const selected = (answers[currentIndex] || []).includes(label);

              return (
                <button
                  key={`${currentQuestion.uid}_${label}`}
                  onClick={() =>
                    setAnswers((prev) => {
                      setSubmitError('');
                      const current = prev[currentIndex] || [];
                      if (currentIsMultiChoice) {
                        const next = current.includes(label)
                          ? current.filter((v) => v !== label)
                          : [...current, label];
                        return { ...prev, [currentIndex]: next };
                      }
                      return { ...prev, [currentIndex]: [label] };
                    })
                  }
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selected
                      ? 'border-[#FF3621] bg-[#fff1f0]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <span className="font-black text-slate-700 min-w-8">{label}.</span>
                    {isImageValue(opt) ? (
                      <img src={opt} alt={`option-${label}`} className="max-w-full rounded border border-slate-200" />
                    ) : (
                      <span className="text-slate-800 whitespace-pre-wrap break-words">{opt}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-3">
            {submitError}
          </div>
        ) : null}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentIndex((v) => Math.max(v - 1, 0))}
            className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm transition-all hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> PREV
          </button>
          <button
            onClick={() => setCurrentIndex((v) => Math.min(v + 1, EXAM_TOTAL - 1))}
            className="flex-1 py-3 bg-[#1b3139] text-white rounded-xl font-bold text-sm transition-all hover:bg-slate-700 flex items-center justify-center gap-2"
          >
            NEXT <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={submit}
            className="flex-1 py-3 bg-[#FF3621] hover:bg-red-600 text-white rounded-xl font-bold text-sm"
          >
            SUBMIT
          </button>
        </div>
      </div>

      <aside
        className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-black text-slate-800">答题进度</h3>
            <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
              关闭
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2">
              {examQuestions.map((q, idx) => (
                <button
                  key={`${q.uid}_${idx}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setSidebarOpen(false);
                  }}
                  className={`h-8 rounded-md border text-xs font-bold transition-colors ${
                    answers[idx] && answers[idx].length > 0
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-500 border-slate-300'
                  } ${idx === currentIndex ? 'ring-2 ring-[#FF3621] ring-offset-1' : 'hover:border-slate-400'}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span>已作答</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border rounded" />
              <span>未作答</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function ExamResults({
  track,
  result,
  onBackMenu,
  onRetry,
}: {
  track: ExamTrack;
  result: ExamResult | null;
  onBackMenu: () => void;
  onRetry: () => void;
}) {
  const [showWrongList, setShowWrongList] = useState(false);

  const score = result?.score ?? 0;
  const totalQuestions = result?.totalQuestions ?? EXAM_TOTAL;
  const correctCount = result?.correctCount ?? 0;
  const wrongCount = totalQuestions - correctCount;
  const weaknesses = result?.weaknesses ?? [];
  const wrongQuestions = result?.wrongQuestions ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="text-6xl font-black text-[#1b3139] mb-3">{score}%</div>
        <p className={`text-lg font-bold mb-4 ${score >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>
          {score >= 70 ? '恭喜通过' : '未达到及格线'}
        </p>
        <p className="text-slate-600">{correctCount} / {totalQuestions} 题正确 · 用时 {result?.duration ?? '0 分钟'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">考试类型</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{track === 'analyst' ? 'Data Analyst' : 'Data Engineer'}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">正确题数</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{correctCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">错误题数</div>
          <div className="text-xl font-bold text-red-600 mt-1">{wrongCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">薄弱知识点分析</h3>
        {weaknesses.length === 0 ? (
          <div className="text-sm text-slate-500">暂无分析数据。</div>
        ) : (
          <div className="space-y-4">
            {weaknesses.map((item) => {
              const color = item.accuracy >= 70 ? 'bg-emerald-500' : item.accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={item.topic}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">{item.topic}</span>
                    <span className="text-sm text-slate-600">正确率 {item.accuracy}% ({item.total - item.wrong}/{item.total})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${item.accuracy}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={onRetry} className="px-6 py-3 bg-[#1b3139] hover:bg-slate-700 text-white rounded-lg font-bold">
          再次挑战
        </button>
        <button
          onClick={() => setShowWrongList((v) => !v)}
          className="px-6 py-3 bg-[#FF3621] hover:bg-red-600 text-white rounded-lg font-bold"
        >
          {showWrongList ? '收起错题' : `查看错题（${wrongQuestions.length}）`}
        </button>
        <button onClick={onBackMenu} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold">
          返回菜单
        </button>
      </div>

      {showWrongList && (
        <div className="space-y-4">
          {wrongQuestions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">本次考试无错题。</div>
          ) : (
            wrongQuestions.map((q, idx) => (
              <div key={`${q.uid}_${idx}`} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                  <div className="text-xs text-red-500 font-bold mb-2">错题 #{idx + 1}</div>
                  <h4 className="font-bold text-slate-900 leading-snug">{q.q}</h4>
                </div>

                {normalizeImgs(q.img).length > 0 && (
                  <div className="space-y-2">
                    {normalizeImgs(q.img).map((src, i) => (
                      <img key={`${q.uid}_wrong_img_${i}`} src={src} alt={`wrong-${i + 1}`} className="w-full rounded-lg border border-slate-200" />
                    ))}
                  </div>
                )}

                <div className="grid gap-2">
                  {q.opts.map((opt, i) => {
                    const label = optionLabel(i);
                    const isCorrect = parseAnswerLabels(q.correct).includes(label);
                    const isSelected = (q.selected || []).includes(label);

                    let cls = 'border-slate-200 bg-white text-slate-700';
                    if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800';
                    if (!isCorrect && isSelected) cls = 'border-red-500 bg-red-50 text-red-800';

                    return (
                      <div key={`${q.uid}_opt_${label}`} className={`p-3 rounded-lg border ${cls}`}>
                        <div className="flex gap-3 items-start">
                          <span className="font-bold min-w-7">{label}.</span>
                          {isImageValue(opt) ? (
                            <img src={opt} alt={`wrong-option-${label}`} className="max-w-full rounded border border-slate-200" />
                          ) : (
                            <span className="whitespace-pre-wrap break-words">{opt}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4">
                  <div className="font-bold mb-1">正确答案：{parseAnswerLabels(q.correct).join(', ')}</div>
                  {q.exp_zh ? <div className="leading-relaxed">{q.exp_zh}</div> : null}
                  {q.exp_link ? (
                    <a href={q.exp_link} target="_blank" rel="noreferrer" className="inline-block mt-2 text-[#FF3621] hover:underline">
                      查看参考链接
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
