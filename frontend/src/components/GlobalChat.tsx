import { useState, useEffect, useRef } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import type { ChatMessage } from '../App'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  if (isToday)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Props = {
  userName: string
  isAdmin: boolean
}

export default function GlobalChat({ userName, isAdmin }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const res = await axios.get<{ messages: ChatMessage[] }>(`${API}/api/global-chat`)
      setMessages(res.data.messages)
    } catch {}
  }

  useEffect(() => {
    fetchMessages()
    const id = setInterval(fetchMessages, 2000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!text.trim()) return
    const msg: ChatMessage = {
      id: uuidv4(),
      author: userName,
      content: text.trim(),
      createdAt: new Date().toISOString(),
      isAdmin,
    }
    setMessages(prev => [...prev, msg])
    setText('')
    axios.post(`${API}/api/global-chat`, msg).catch(() => {
      setMessages(prev => prev.filter(m => m.id !== msg.id))
    })
  }

  const handleDelete = (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId))
    axios.delete(`${API}/api/global-chat/${msgId}`).catch(() => fetchMessages())
  }

  // Group consecutive messages by same author
  const grouped = messages.map((msg, i) => ({
    ...msg,
    showHeader: i === 0 || messages[i - 1].author !== msg.author,
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[12px]" style={{ color: 'var(--t-text3)' }}>가장 먼저 메시지를 보내보세요</p>
          </div>
        )}
        {grouped.map(msg => {
          const isMine = msg.author === userName
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${msg.showHeader ? 'mt-3' : 'mt-0.5'}`}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {msg.showHeader && (
                <div className={`flex items-center gap-1.5 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ background: msg.isAdmin ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#22c55e,#16a34a)' }}
                  >
                    {msg.author[0]}
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: msg.isAdmin ? '#6366f1' : 'var(--t-text2)' }}>
                    {msg.author}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                <div
                  className="max-w-[180px] px-3 py-2 rounded-2xl text-[12px] leading-relaxed break-words"
                  style={isMine
                    ? { background: '#6366f1', color: '#fff', borderBottomRightRadius: 6 }
                    : { background: 'var(--t-surface2)', color: 'var(--t-text)', border: '1px solid var(--t-border)', borderBottomLeftRadius: 6 }
                  }
                >
                  {msg.content}
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] flex-shrink-0 whitespace-nowrap" style={{ color: 'var(--t-text3)' }}>
                    {formatTime(msg.createdAt)}
                  </span>
                  {(isAdmin || msg.author === userName) && hoveredId === msg.id && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="p-0.5 rounded transition-colors"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5" style={{ borderTop: '1px solid var(--t-border)' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="전체 채팅..."
          className="flex-1 bg-transparent text-[12px] outline-none"
          style={{ color: 'var(--t-text)' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-all disabled:opacity-30 flex-shrink-0"
          style={{ background: text.trim() ? '#6366f1' : 'var(--t-surface2)' }}
        >
          <Send className="w-3 h-3" style={{ color: text.trim() ? '#fff' : 'var(--t-text3)' }} />
        </button>
      </div>
    </div>
  )
}
