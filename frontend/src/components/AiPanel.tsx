import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Bot, Send, Loader2, Settings } from 'lucide-react'
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
      content: '해당 기능은 추후 오픈 예정입니다.',
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
      className="w-96 flex-shrink-0 h-full flex flex-col"
      style={{
        background: 'var(--t-surface)',
        borderLeft: '1px solid var(--t-border)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--t-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>AI Agent</h3>
            <p className="text-[10px]" style={{ color: 'var(--t-text3)' }}>by {model.startsWith('gemini') ? 'Gemini' : 'ChatGPT'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(v => !v)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: showSettings ? '#6366f1' : 'var(--t-text3)' }}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--t-text3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 space-y-2 flex-shrink-0" style={{ background: 'var(--t-surface2)', borderBottom: '1px solid var(--t-border)' }}>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--t-text3)' }}>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); localStorage.setItem('at_api_key', e.target.value) }}
              placeholder="sk-..."
              className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none transition-all"
              style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--t-text3)' }}>Model</label>
            <select
              value={model}
              onChange={e => { setModel(e.target.value); localStorage.setItem('at_model', e.target.value) }}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none transition-all"
              style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
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
              <div
                className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap"
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', borderBottomRightRadius: 6 }
                  : { background: 'var(--t-surface2)', color: 'var(--t-text)', border: '1px solid var(--t-border)', borderBottomLeftRadius: 6 }
                }
              >
                {msg.content}
              </div>

              {msg.tasks && msg.tasks.length > 0 && msg.targetColId && (
                <div className="w-full rounded-xl p-3 space-y-2" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p className="text-[11px] font-semibold" style={{ color: '#6366f1' }}>생성될 태스크 ({msg.tasks.length}개)</p>
                  {msg.tasks.map((t, idx) => (
                    <div key={idx} className="text-[11px] flex items-center gap-1.5" style={{ color: '#6366f1' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)' }}>{idx + 1}</span>
                      {t.title}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      if (msg.tasks && msg.targetColId) onInjectTasks(msg.tasks, msg.targetColId)
                    }}
                    className="w-full mt-1 py-2 text-xs font-semibold text-white rounded-lg transition-all"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
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
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#6366f1' }} />
              <span className="text-xs" style={{ color: 'var(--t-text2)' }}>생각 중...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--t-border)' }}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
            placeholder="업무 쪼개기, 일정 분석 등을 요청해 보세요..."
            className="flex-1 text-sm px-3.5 py-2.5 rounded-xl resize-none outline-none transition-all max-h-24"
            style={{
              background: 'var(--t-surface2)',
              border: '1px solid var(--t-border)',
              color: 'var(--t-text)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
