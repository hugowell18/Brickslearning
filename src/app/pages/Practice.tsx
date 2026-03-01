import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, BookmarkPlus, Bookmark } from 'lucide-react';
import { questions } from '../data/mockData';
import { useApp } from '../../context/AppContext';
import { useLocation, useNavigate } from 'react-router';
import ConfirmActionDialog from '../components/ConfirmActionDialog';
import { getPracticeDotClassName, getPracticeDotState } from './practiceProgressState';
import { shouldMarkCompletedOnNext, shouldMarkCompletedOnSubmit } from './practiceCompletionPolicy';
import { normalizeReviewRequestIds } from '../utils/wrongReview';
import { buildQuestionOptionOrder, selectedDisplayToOriginal } from '../utils/optionOrder';

const REQUIRE_MULTI_CHOICE_SELECTION = true;

const CATEGORY_MODULE_MAP: Record<string, string> = {
  'Data Analyst': 'ma1',
  'Data Engineer': 'me1',
};

export default function Practice() {
  type PracticeState = 'selection' | 'in-session';
  const [practiceState, setPracticeState] = useState<PracticeState>('selection');
  const [progressTabOpen, setProgressTabOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [reviewSessionUids, setReviewSessionUids] = useState<string[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [bookmarked, setBookmarked] = useState<string[]>([]);
  const [jumpValue, setJumpValue] = useState('');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [entryNotice, setEntryNotice] = useState('');
  const [sessionSeed, setSessionSeed] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const {
    updateProgress,
    markQuestionCompleted,
    completedQuestions,
    questionStatus,
    setQuestionResult,
    clearPracticeProgress,
    recordQuestionAttempt,
    recordQuestionReview,
    cloudState,
  } = useApp();

  const categories = Array.from(new Set(questions.map((q) => q.category)));
  const questionMap = useMemo(() => new Map(questions.map((q) => [q.uid, q])), []);
  const allQuestionIds = useMemo(() => new Set(questions.map((q) => q.uid)), []);
  const isReviewMode = !!reviewSessionUids;
  const filteredQuestions = useMemo(() => {
    if (reviewSessionUids) {
      const sessionQuestions: typeof questions = [];
      for (const uid of reviewSessionUids) {
        const q = questionMap.get(uid);
        if (q) sessionQuestions.push(q);
      }
      return sessionQuestions;
    }
    return selectedCategory ? questions.filter((q) => q.category === selectedCategory) : [];
  }, [reviewSessionUids, questionMap, selectedCategory]);
  const currentQuestion = filteredQuestions[currentQuestionIndex];
  const optionView = useMemo(() => {
    if (!currentQuestion) return null;
    return buildQuestionOptionOrder(currentQuestion, sessionSeed || 'practice-default');
  }, [currentQuestion, sessionSeed]);
  const completedCount = filteredQuestions.filter((q) => completedQuestions.includes(q.uid)).length;
  const completionPct = filteredQuestions.length > 0 ? Math.round((completedCount / filteredQuestions.length) * 100) : 0;

  const getOptionLabel = (index: number) => String.fromCharCode(65 + index);
  const parseAnswerLabels = (ans?: string) =>
    (ans || '')
      .toUpperCase()
      .split('')
      .filter((ch) => ch >= 'A' && ch <= 'Z');
  const isMultiChoice = !!currentQuestion && parseAnswerLabels(currentQuestion.ans).length > 1;

  useEffect(() => {
    if (practiceState !== 'selection') return;
    const state = location.state as { mode?: string; uids?: string[] } | null;
    if (!state || state.mode !== 'wrong-review') return;
    const normalizedUids = normalizeReviewRequestIds(state.uids, allQuestionIds);
    if (normalizedUids.length > 0) {
      setReviewSessionUids(normalizedUids);
      setSelectedCategory('');
      setPracticeState('in-session');
      setProgressTabOpen(false);
      setCurrentQuestionIndex(0);
      setSelectedAnswers([]);
      setSubmitError('');
      setShowExplanation(false);
      setEntryNotice('');
      setSessionSeed(`wrong-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    } else {
      setEntryNotice('当前没有可复习的错题，已返回普通练习入口。');
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [practiceState, location.state, location.pathname, navigate, allQuestionIds]);

  const handleSubmit = () => {
    if (!currentQuestion) return;
    if (REQUIRE_MULTI_CHOICE_SELECTION && isMultiChoice && selectedAnswers.length === 0) {
      setSubmitError('多选题至少选择 1 项后再提交。');
      return;
    }
    setSubmitError('');
    setShowExplanation(true);
    if (shouldMarkCompletedOnSubmit()) {
      markQuestionCompleted(currentQuestion.uid);
    }
    recordQuestionReview(currentQuestion.uid);

    if (selectedAnswers.length > 0) {
      const expected = new Set(parseAnswerLabels(currentQuestion.ans));
      const selected = new Set(
        selectedDisplayToOriginal(selectedAnswers, optionView?.labelToOriginalLabel || {}),
      );
      const isCorrect =
        expected.size === selected.size && [...expected].every((label) => selected.has(label));
      setQuestionResult(currentQuestion.uid, isCorrect);
      recordQuestionAttempt(currentQuestion.uid, isCorrect);
    }
  };

  const handleNext = () => {
    if (!currentQuestion || filteredQuestions.length === 0) return;
    const nextIndex = (currentQuestionIndex + 1) % filteredQuestions.length;
    const isLast = currentQuestionIndex === filteredQuestions.length - 1;

    setCurrentQuestionIndex(nextIndex);
    setSelectedAnswers([]);
    setSubmitError('');
    setShowExplanation(false);

    if (isLast && selectedCategory) {
      const modId = CATEGORY_MODULE_MAP[selectedCategory];
      if (modId) updateProgress(modId, 'completed');
    }

    if (shouldMarkCompletedOnNext()) {
      markQuestionCompleted(currentQuestion.uid);
    }
  };

  const handleJump = () => {
    const num = parseInt(jumpValue, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= filteredQuestions.length) {
      setCurrentQuestionIndex(num - 1);
      setSelectedAnswers([]);
      setSubmitError('');
      setShowExplanation(false);
      setJumpValue('');
    }
  };

  const handlePrevious = () => {
    if (filteredQuestions.length === 0) return;
    setCurrentQuestionIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);
    setSelectedAnswers([]);
    setSubmitError('');
    setShowExplanation(false);
  };

  const toggleBookmark = () => {
    if (!currentQuestion) return;
    if (bookmarked.includes(currentQuestion.uid)) {
      setBookmarked(bookmarked.filter((id) => id !== currentQuestion.uid));
    } else {
      setBookmarked([...bookmarked, currentQuestion.uid]);
    }
  };

  const handleClearProgress = () => {
    if (!filteredQuestions.length) return;
    clearPracticeProgress(
      filteredQuestions.map((q) => q.uid),
      selectedCategory,
    );
    setClearDialogOpen(false);
    setPracticeState('selection');
    setReviewSessionUids(null);
    setProgressTabOpen(false);
  };

  if (practiceState === 'selection') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">题库练习</h1>
          <p className="text-gray-600 mt-1">请选择要练习的分类。</p>
        </div>

        {cloudState.blocked && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">
            云端同步异常：{cloudState.message || '严格一致模式下，写操作已被阻止。'}
          </div>
        )}
        {entryNotice && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm">
            {entryNotice}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setReviewSessionUids(null);
                setEntryNotice('');
                setPracticeState('in-session');
                setProgressTabOpen(false);
                setCurrentQuestionIndex(0);
                setSelectedAnswers([]);
                setSubmitError('');
                setShowExplanation(false);
                setSessionSeed(`${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
                const modId = CATEGORY_MODULE_MAP[category];
                if (modId) updateProgress(modId, 'in-progress');
              }}
              className="text-left p-6 rounded-lg border-2 bg-white border-gray-200 hover:border-gray-300 transition-all"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{category}</h3>
              <p className="text-sm text-gray-600">共 {questions.filter((q) => q.category === category).length} 题</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No questions found for this category.</p>
        </div>
      </div>
    );
  }

  const correctAnswerLabels = optionView ? Array.from(optionView.expectedDisplay).sort() : parseAnswerLabels(currentQuestion.ans);
  const correctAnswerSet = new Set(correctAnswerLabels);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">题库练习</h1>
          <p className="text-gray-600 mt-1">
            {isReviewMode ? `错题会话模式 · 共 ${filteredQuestions.length} 题` : `已完成 ${completedCount} / ${filteredQuestions.length}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isReviewMode && (
            <button
              onClick={() => {
                setPracticeState('selection');
                setReviewSessionUids(null);
              }}
              className="h-10 px-4 inline-flex items-center justify-center bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              退出错题模式
            </button>
          )}
          <button
            onClick={() => {
              setPracticeState('selection');
              setReviewSessionUids(null);
            }}
            className="h-10 px-4 inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            返回分类
          </button>
          <button
            onClick={() => setProgressTabOpen((prev) => !prev)}
            className="h-10 px-4 inline-flex items-center justify-center bg-[#1b3139] hover:bg-[#29454f] border border-[#1b3139] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            进度侧栏
          </button>
        </div>
      </div>

      {cloudState.blocked && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          云端同步异常：{cloudState.message || '严格一致模式下，写操作已被阻止。'}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max={filteredQuestions.length}
          placeholder="题号"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          className="w-20 p-2 border rounded"
        />
        <button onClick={handleJump} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          Go
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="text-sm text-gray-600">
            第 {currentQuestionIndex + 1} / {filteredQuestions.length} 题
            {questionStatus[currentQuestion.uid] === 'correct' && <span className="ml-2 text-green-600">（已答对）</span>}
            {questionStatus[currentQuestion.uid] === 'incorrect' && <span className="ml-2 text-red-600">（曾答错）</span>}
          </div>
          <button onClick={toggleBookmark} className="text-gray-600 hover:text-orange-500 transition-colors">
            {bookmarked.includes(currentQuestion.uid) ? (
              <Bookmark className="w-6 h-6 fill-current text-orange-500" />
            ) : (
              <BookmarkPlus className="w-6 h-6" />
            )}
          </button>
        </div>

        <div className="mb-4">
          <div className="text-sm font-semibold text-blue-600 mb-2">{currentQuestion.category}</div>
          <div className="text-gray-700 mb-2">{currentQuestion.q}</div>
          {isMultiChoice && (
            <div className="inline-flex items-center rounded bg-orange-50 text-orange-700 text-xs font-semibold px-2 py-1">
              多选题（可选择多个答案）
            </div>
          )}
        </div>

        {currentQuestion.img && (
          <div className="mb-6 flex flex-col gap-4">
            {Array.isArray(currentQuestion.img) ? (
              currentQuestion.img.map((src, idx) => <img key={idx} src={src} alt={`question illustration ${idx + 1}`} className="max-w-full mx-auto" />)
            ) : (
              <img src={currentQuestion.img} alt="question illustration" className="max-w-full mx-auto" />
            )}
          </div>
        )}

        <div className="mb-6 text-gray-900 font-medium">{currentQuestion.q_zh}</div>

        <div className="space-y-3 mb-6">
          {(optionView?.displayedOptions || []).map((item) => {
            const optionLabel = item.displayLabel;
            const option = item.text;
            const isSelected = selectedAnswers.includes(optionLabel);
            const isCorrect = correctAnswerSet.has(optionLabel);

            return (
              <button
                key={item.displayIndex}
                onClick={() => {
                  if (showExplanation) return;
                  setSubmitError('');
                  if (isMultiChoice) {
                    setSelectedAnswers((prev) =>
                      prev.includes(optionLabel)
                        ? prev.filter((v) => v !== optionLabel)
                        : [...prev, optionLabel],
                    );
                    return;
                  }
                  setSelectedAnswers([optionLabel]);
                }}
                disabled={showExplanation}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  showExplanation
                    ? isCorrect
                      ? 'bg-green-50 border-green-500'
                      : isSelected
                      ? 'bg-red-50 border-red-500'
                      : 'border-gray-200'
                    : isSelected
                    ? 'bg-orange-50 border-orange-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex gap-4">
                  <span className="font-semibold text-gray-700 min-w-8">{optionLabel}</span>
                  {option.startsWith('data:image') ? (
                    <img src={option} alt={`option ${optionLabel}`} className="max-w-full" />
                  ) : (
                    <span className="flex-1">{option}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {submitError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {submitError}
          </div>
        )}

        {showExplanation && (
          <div className="space-y-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="font-semibold text-green-900">Correct Answer: {correctAnswerLabels.join(', ')}</div>
            </div>

            {currentQuestion.exp_link && (
              <a href={currentQuestion.exp_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
                DOCS ↗
              </a>
            )}

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="font-medium text-blue-900 mb-1">解析</div>
              <p className="text-blue-800 text-sm">{currentQuestion.exp_zh}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button onClick={handlePrevious} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
            上一题
          </button>

          <div className="flex gap-2">
            {!showExplanation && (
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-gray-800 transition-colors">
                显示解析
              </button>
            )}
            <button onClick={handleNext} className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
              下一题
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionDialog
        open={clearDialogOpen}
        title="确认清空练习进度？"
        description="这将清空当前分类的做题记录与学习进度，此操作不可恢复。"
        confirmText="确认清空"
        cancelText="取消"
        destructive
        onOpenChange={setClearDialogOpen}
        onConfirm={handleClearProgress}
      />

      <aside
        className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-30 transform transition-transform duration-300 ${
          progressTabOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800">持久化进度</h3>
              <button onClick={() => setProgressTabOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                关闭
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-600">
              <div>分类：<span className="font-semibold text-slate-800">{isReviewMode ? '错题复习' : selectedCategory}</span></div>
              <div>进度：<span className="font-semibold text-slate-800">{completionPct}%</span></div>
              <div>已完成 {completedCount} / {filteredQuestions.length}</div>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2">
              {filteredQuestions.map((q, idx) => {
                const status = questionStatus[q.uid];
                const isCurrent = idx === currentQuestionIndex;
                const isCompleted = completedQuestions.includes(q.uid);
                const dotState = getPracticeDotState(status, isCompleted);
                const className = getPracticeDotClassName(dotState, isCurrent);
                return (
                  <button
                    key={q.uid}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setSelectedAnswers([]);
                      setSubmitError('');
                      setShowExplanation(false);
                      setProgressTabOpen(false);
                    }}
                    className={`h-8 rounded-md border text-xs font-bold transition-colors ${className}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t space-y-3">
            <div className="text-xs text-slate-500">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span>答对</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span>答错</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white border rounded" />
                <span>未答</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded" />
                <span>已做（未判分）</span>
              </div>
            </div>
            <button
              onClick={() => setClearDialogOpen(true)}
              className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
              disabled={cloudState.blocked}
            >
              清空当前分类进度
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

