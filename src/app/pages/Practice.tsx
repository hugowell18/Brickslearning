import { useState } from 'react';
import { ChevronRight, ChevronLeft, BookmarkPlus, Bookmark, Check, X, Lightbulb } from 'lucide-react';
import { questions } from '../data/mockData';

export default function Practice() {
  const [selectedTrack, setSelectedTrack] = useState<'analyst' | 'engineer'>('analyst');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [bookmarked, setBookmarked] = useState<string[]>([]);

  const filteredQuestions = questions.filter(q => {
    const matchTrack = q.track === selectedTrack;
    const matchTags = selectedTags.length === 0 || selectedTags.some(tag => q.tags.includes(tag));
    return matchTrack && matchTags;
  });

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  const allTags = Array.from(new Set(questions.flatMap(q => q.tags)));

  const handleSubmit = () => {
    setShowExplanation(true);
  };

  const handleNext = () => {
    setCurrentQuestionIndex((prev) => (prev + 1) % filteredQuestions.length);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const toggleBookmark = () => {
    if (bookmarked.includes(currentQuestion.id)) {
      setBookmarked(bookmarked.filter(id => id !== currentQuestion.id));
    } else {
      setBookmarked([...bookmarked, currentQuestion.id]);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-600">没有找到符合条件的题目</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">题库练习</h1>
        <p className="text-gray-600 mt-1">通过单题练习巩固知识点，标记错题与收藏</p>
      </div>

      {/* Track Selector */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => {
            setSelectedTrack('analyst');
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setShowExplanation(false);
          }}
          className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
            selectedTrack === 'analyst'
              ? 'bg-blue-50 border-blue-500 text-blue-900 font-medium'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          Data Analyst
        </button>
        <button
          onClick={() => {
            setSelectedTrack('engineer');
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setShowExplanation(false);
          }}
          className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
            selectedTrack === 'engineer'
              ? 'bg-purple-50 border-purple-500 text-purple-900 font-medium'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          Data Engineer
        </button>
      </div>

      {/* Tag Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-sm font-medium text-gray-700 mb-3">按标签筛选：</div>
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedTags.includes(tag)
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedTrack === 'analyst' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {currentQuestionIndex + 1} / {filteredQuestions.length}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              currentQuestion.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {currentQuestion.difficulty === 'easy' ? '简单' : 
               currentQuestion.difficulty === 'medium' ? '中等' : '困难'}
            </span>
          </div>
          <button onClick={toggleBookmark} className="text-gray-600 hover:text-orange-500 transition-colors">
            {bookmarked.includes(currentQuestion.id) ? (
              <Bookmark className="w-6 h-6 fill-current text-orange-500" />
            ) : (
              <BookmarkPlus className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{currentQuestion.content}</h3>
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showResult = showExplanation;

              return (
                <button
                  key={index}
                  onClick={() => !showExplanation && setSelectedAnswer(index)}
                  disabled={showExplanation}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    showResult
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
                  <div className="flex items-center justify-between">
                    <span className="flex-1">{option}</span>
                    {showResult && isCorrect && <Check className="w-5 h-5 text-green-600" />}
                    {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-red-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900 mb-1">解析：</div>
                <p className="text-blue-800 text-sm">{currentQuestion.explanation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {currentQuestion.tags.map(tag => (
            <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            上一题
          </button>

          {!showExplanation ? (
            <button
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
              className={`w-full sm:w-auto px-6 py-2 rounded-lg transition-colors ${
                selectedAnswer !== null
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              提交答案
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              下一题
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleNext}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            下一题
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
