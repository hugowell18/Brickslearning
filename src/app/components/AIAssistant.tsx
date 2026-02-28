import { useMemo, useState } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import { askAiAssistant } from '../../lib/supabaseClient';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
const MODEL_OPTIONS = [
  'Qwen/Qwen3.5-27B',
  'deepseek-ai/DeepSeek-V3.2',
  'MiniMax/MiniMax-M2.5',
] as const;
const MODEL_STORAGE_KEY = 'db_ai_model';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window === 'undefined') return MODEL_OPTIONS[0];
    const saved = (window.localStorage.getItem(MODEL_STORAGE_KEY) || '').trim();
    return MODEL_OPTIONS.includes(saved as any) ? saved : MODEL_OPTIONS[0];
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好，我是 AI 学习助手。你可以随时问我 Databricks、SQL、题目解析相关问题。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const history = useMemo(() => messages.slice(-10), [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const answer = await askAiAssistant(
        text,
        history.filter((m) => m.role === 'user' || m.role === 'assistant'),
        selectedModel,
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `调用失败：${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
          aria-label="Open AI assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-96 h-[600px] max-h-[80vh] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 mx-4 sm:mx-0">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">AI 学习助手</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded" aria-label="Close AI assistant">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-700 inline-flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在思考...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 shrink-0">模型</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedModel(v);
                  try {
                    window.localStorage.setItem(MODEL_STORAGE_KEY, v);
                  } catch {
                    // ignore
                  }
                }}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                disabled={loading}
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="输入你的问题..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                disabled={loading}
              />
              <button
                onClick={() => void handleSend()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
