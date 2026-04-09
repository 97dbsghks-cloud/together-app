import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Bot, Send, Loader2 } from 'lucide-react'
import axios from 'axios'
import type { Task, Column } from '../App'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'

type Message = {
  role: 'user' | 'assistant'
  content: string
  tasks?: Partial<Task>[]
  targetColId?: string
}

type Props = {
  tasks: Task[]
  columns: Column[]
  onClose: () => void
  onInjectTasks: (tasks: Partial<Task>[], colId: string) => void
}

export default function AiPanel({ tasks, columns, onClose, onInjectTasks }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 프로젝트 AI 비서입니다. 업무를 쪼개거나 일정 리스크를 분석하는 등 무엇이든 도와드릴게요.\n\n예시: "인허가 접수 업무 태스크로 쪼개줘" 또는 "현재 진행상황 좀 분석해줘"',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('at_api_key') || '')
  const [model, setModel] = useState(localStorage.getItem('at_model') || 'gpt-4o')
  const [showSettings, setShowSettings] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const boardSummary = columns.map(c => ({
      column: c.title,
      count: tasks.filter(t => t.columnId === c.id).length,
      tasks: tasks.filter(t => t.columnId === c.id).map(t => t.title)
    }))

    try {
      const res = await axios.post(`${API}/api/ai/chat`, {
        message: userMsg,
        board_summary: boardSummary,
        column_ids: columns.map(c => ({ id: c.id, title: c.title })),
        api_key: apiKey,
        model: model,
      })
      const data = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        tasks: data.new_tasks,
        targetColId: data.target_column_id,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ API 연결 오류입니다. 환경설정에서 API 키와 모델을 확인해 주세요.',
      }])
    }
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 260 }}
      className="w-96 flex-shrink-0 h-full flex flex-col bg-white border-l border-gray-100"
      style={{ boxShadow: '-4px 0 20px rgba(0,0,0,0.06)' }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}>
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">AI 프로젝트 매니저</h3>
            <p className="text-[10px] text-gray-400">by {model.startsWith('gemini') ? 'Gemini' : 'ChatGPT'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(v => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs font-medium"
          >
            ⚙️
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-2">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); localStorage.setItem('at_api_key', e.target.value) }}
              placeholder="sk-..."
              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Model</label>
            <select
              value={model}
              onChange={e => { setModel(e.target.value); localStorage.setItem('at_model', e.target.value) }}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="gpt-4o">ChatGPT</option>
              <option value="gemini-2.0-flash">Gemini</option>
            </select>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
              <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'text-white rounded-tr-md'
                  : 'bg-gray-50 text-gray-800 rounded-tl-md border border-gray-100'
              }`}
                style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #007aff, #5856d6)' } : {}}
              >
                {msg.content}
              </div>

              {/* Inject Tasks Button */}
              {msg.tasks && msg.tasks.length > 0 && msg.targetColId && (
                <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-blue-600">생성될 태스크 ({msg.tasks.length}개)</p>
                  {msg.tasks.map((t, idx) => (
                    <div key={idx} className="text-[11px] text-blue-700 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{idx + 1}</span>
                      {t.title}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      if (msg.tasks && msg.targetColId) onInjectTasks(msg.tasks, msg.targetColId)
                    }}
                    className="w-full mt-1 py-2 text-xs font-semibold text-white rounded-lg transition-all"
                    style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
                  >
                    ✨ 보드에 추가하기
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="text-xs text-gray-500">생각 중...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
            placeholder="업무 쪼개기, 일정 분석 등을 요청해 보세요..."
            className="flex-1 text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition-all max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
