import { useState } from 'react';
import { ChevronRight, ChevronLeft, BookmarkPlus, Bookmark } from 'lucide-react';
import { questions } from '../data/mockData';

export default function Practice() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Data Analyst');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [bookmarked, setBookmarked] = useState<string[]>([]);
  const [jumpValue, setJumpValue] = useState('');

  // Get unique categories from questions
  const categories = Array.from(new Set(questions.map(q => q.category)));
  
  // Filter questions by category
  const filteredQuestions = questions.filter(q => q.category === selectedCategory);
  const currentQuestion = filteredQuestions[currentQuestionIndex];

  // Convert ans (A/B/C/D) to index
  const getCorrectAnswerIndex = () => {
    if (!currentQuestion) return -1;
    const answerMap: { [key: string]: number } = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    return answerMap[currentQuestion.ans] || 0;
  };

  const handleSubmit = () => {
    setShowExplanation(true);
  };

  const handleNext = () => {
    setCurrentQuestionIndex((prev) => (prev + 1) % filteredQuestions.length);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const handleJump = () => {
    const num = parseInt(jumpValue, 10);
    if (!isNaN(num) && num >= 1 && num <= filteredQuestions.length) {
      setCurrentQuestionIndex(num - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setJumpValue('');
    }
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const toggleBookmark = () => {
    if (bookmarked.includes(currentQuestion.uid)) {
      setBookmarked(bookmarked.filter(id => id !== currentQuestion.uid));
    } else {
      setBookmarked([...bookmarked, currentQuestion.uid]);
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

  const correctAnswerIndex = getCorrectAnswerIndex();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">题库练习</h1>
        <p className="text-gray-600 mt-1">通过单题练习巩固知识点，标记错题与收藏</p>
      </div>

      {/* Jump to question */}
      <div className="flex items-center gap-2 mt-2">
        <input
          type="number"
          min="1"
          max={filteredQuestions.length}
          placeholder="题号"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          className="w-20 p-2 border rounded"
        />
        <button
          onClick={handleJump}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Go
        </button>
      </div>

      {/* Category Selector */}
      {categories.length > 1 && (
        <div className="flex flex-col sm:flex-row gap-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setCurrentQuestionIndex(0);
                setSelectedAnswer(null);
                setShowExplanation(false);
              }}
              className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                selectedCategory === category
                  ? 'bg-blue-50 border-blue-500 text-blue-900 font-medium'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Question Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Header with bookmark */}
        <div className="flex items-start justify-between mb-6">
          <div className="text-sm text-gray-600">
            问 {currentQuestionIndex + 1} / {filteredQuestions.length}
          </div>
          <button onClick={toggleBookmark} className="text-gray-600 hover:text-orange-500 transition-colors">
            {bookmarked.includes(currentQuestion.uid) ? (
              <Bookmark className="w-6 h-6 fill-current text-orange-500" />
            ) : (
              <BookmarkPlus className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Category and English Question */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-blue-600 mb-2">{currentQuestion.category}</div>
          <div className="text-gray-700 mb-2">{currentQuestion.q}</div>
        </div>

        {/* Optional image(s) */}
        {currentQuestion.img && (
          <div className="mb-6 flex flex-col gap-4">
            {Array.isArray(currentQuestion.img) ? (
              currentQuestion.img.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`question illustration ${idx + 1}`}
                  className="max-w-full mx-auto"
                />
              ))
            ) : (
              <img
                src={currentQuestion.img}
                alt="question illustration"
                className="max-w-full mx-auto"
              />
            )}
          </div>
        )}

        {/* Chinese Question */}
        <div className="mb-6 text-gray-900 font-medium">
          {currentQuestion.q_zh}
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.opts.map((option, index) => {
            const optionLabel = ['A', 'B', 'C', 'D'][index];
            const isSelected = selectedAnswer === optionLabel;
            const isCorrect = index === correctAnswerIndex;
            const showResult = showExplanation;

            return (
              <button
                key={index}
                onClick={() => !showExplanation && setSelectedAnswer(optionLabel)}
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
                <div className="flex gap-4">
                  <span className="font-semibold text-gray-700 min-w-8">{optionLabel}</span>
                  {option.startsWith('data:image') ? (
                    <img
                      src={option}
                      alt={`option ${optionLabel}`}
                      className="max-w-full"
                    />
                  ) : (
                    <span className="flex-1">{option}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Result Display */}
        {showExplanation && (
          <div className="space-y-4 mb-6">
            {/* Correct Answer Indicator */}
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="font-semibold text-green-900">
                正确答案 {['A', 'B', 'C', 'D'][correctAnswerIndex]}
              </div>
            </div>

            {/* Documentation Link */}
            {currentQuestion.exp_link && (
              <a
                href={currentQuestion.exp_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                DOCS ↗
              </a>
            )}

            {/* Explanation with Lightbulb Icon */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <div className="font-medium text-blue-900 mb-1">解题复盘</div>
                  <p className="text-blue-800 text-sm">{currentQuestion.exp_zh}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            上一题
          </button>

          <div className="flex gap-2">
            {!showExplanation && (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-gray-800 transition-colors"
              >
                显示解析
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              下一题
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
