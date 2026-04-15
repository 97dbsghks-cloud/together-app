import { useState, useRef, useEffect } from 'react'
import { Send, Shield, Trash2, MessageSquare } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import clsx from 'clsx'
import type { ChatMessage } from '../App'

const ADMIN_CODE = '0000'

type Props = {
  projectName: string
  messages: ChatMessage[]
  onClose: () => void
  onSend: (msg: ChatMessage) => void
  onDelete: (msgId: string) => void
  fullPage?: boolean
  userName?: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  if (isToday) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ChatPanel({ projectName, messages, onClose, onSend, onDelete, fullPage, userName }: Props) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState(() => userName || localStorage.getItem('chat_author') || '')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const prevProjectRef = useRef(projectName)

  useEffect(() => {
    const isProjectChange = prevProjectRef.current !== projectName
    prevProjectRef.current = projectName
    endRef.current?.scrollIntoView(isProjectChange ? undefined : { behavior: 'smooth' })
  }, [messages, projectName])

  const handleSend = () => {
    if (!text.trim()) return
    if (isAdmin && adminCode !== ADMIN_CODE) return
    const name = isAdmin ? '관리자' : (author.trim() || '익명')
    localStorage.setItem('chat_author', isAdmin ? '' : name)
    onSend({
      id: uuidv4(),
      author: name,
      content: text.trim(),
      createdAt: new Date().toISOString(),
      isAdmin,
    })
    setText('')
  }

  const toggleAdmin = () => {
    setIsAdmin(v => !v)
    setAdminCode('')
  }

  // Group messages: show author label only when sender changes
  const grouped = messages.map((msg, i) => ({
    ...msg,
    showAuthor: i === 0 || messages[i - 1].author !== msg.author || messages[i - 1].isAdmin !== msg.isAdmin,
  }))

  const containerClass = fullPage
    ? 'flex-1 flex flex-col t-surface min-h-0'
    : 'w-80 flex-shrink-0 h-full flex flex-col t-surface border-l t-border'

  const containerStyle = fullPage
    ? {}
    : { boxShadow: '-4px 0 20px rgba(0,0,0,0.06)' }

  return (
    <div className={containerClass} style={containerStyle}>
      {/* Header — only shown in side-panel mode */}
      {!fullPage && (
        <div className="flex items-center justify-between px-4 py-4 border-b t-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #ff9f0a, #ff6b35)' }}>
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold t-text">팀 채팅</h3>
              <p className="text-[10px] t-text3 truncate max-w-[140px]">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div className={clsx('flex-1 overflow-y-auto', fullPage ? 'px-6' : 'px-4')}>
        <div className="flex flex-col justify-end min-h-full py-3 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(255,159,10,0.1)' }}>
              <MessageSquare className="w-5 h-5" style={{ color: '#ff9f0a' }} />
            </div>
            <p className="text-[12px] text-gray-400 font-medium">아직 메시지가 없습니다</p>
            <p className="text-[11px] text-gray-300 mt-0.5">팀원들과 대화를 시작해보세요</p>
          </div>
        )}

        {grouped.map(msg => {
          const isMine = !!userName && msg.author === userName
          return (
            <div
              key={msg.id}
              className={clsx('flex gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className={clsx('flex flex-col', isMine ? 'items-end' : 'items-start', fullPage ? 'max-w-[60%]' : 'max-w-[78%]')}>
                {msg.showAuthor && (
                  <div className={clsx('flex items-center gap-1 mb-1 mt-2', isMine ? 'flex-row-reverse' : '')}>
                    {msg.isAdmin && <Shield className="w-2.5 h-2.5" style={{ color: '#007aff' }} />}
                    <span className="text-[10px] font-semibold text-gray-400">{msg.author}</span>
                  </div>
                )}
                <div className="flex items-end gap-1.5">
                  {isMine && hoveredId === msg.id && (
                    <button
                      onClick={() => onDelete(msg.id)}
                      className="p-1 rounded-md text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mb-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <div
                    className={clsx(
                      'px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words',
                      isMine
                        ? 'text-white rounded-tr-md'
                        : 't-surface2 t-text rounded-tl-md'
                    )}
                    style={isMine ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}
                  >
                    {msg.content}
                  </div>
                  {!isMine && hoveredId === msg.id && (
                    <button
                      onClick={() => onDelete(msg.id)}
                      className="p-1 rounded-md text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mb-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="text-[9px] text-gray-300 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className={clsx('pb-4 pt-3 border-t t-border space-y-2 flex-shrink-0', fullPage ? 'px-6' : 'px-4')}>
        {/* Author row */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAdmin}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0',
              isAdmin ? 'text-white' : 't-text3 t-hover t-surface2'
            )}
            style={isAdmin ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}
          >
            <Shield className="w-3 h-3" />
            관리자
          </button>
          {isAdmin ? (
            <input
              type="password"
              maxLength={4}
              value={adminCode}
              onChange={e => setAdminCode(e.target.value)}
              placeholder="코드"
              className="w-20 px-2 py-1 text-xs border t-border rounded-lg t-surface outline-none focus:border-blue-400 text-center tracking-widest t-text"
            />
          ) : userName ? (
            <input
              value={author}
              readOnly
              className="flex-1 px-2.5 py-1 text-xs border t-border rounded-lg t-surface2 outline-none cursor-default t-text"
            />
          ) : (
            <input
              value={author}
              onChange={e => { setAuthor(e.target.value); localStorage.setItem('chat_author', e.target.value) }}
              placeholder="이름 (선택)"
              className="flex-1 px-2.5 py-1 text-xs border t-border rounded-lg t-surface outline-none focus:border-orange-300 transition-colors t-text"
            />
          )}
        </div>

        {/* Text input */}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend() } }}
            rows={1}
            placeholder="메시지를 입력하세요..."
            className="flex-1 text-sm px-3 py-2.5 border t-border rounded-xl resize-none outline-none focus:border-orange-300 t-surface t-text transition-all max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || (isAdmin && adminCode !== ADMIN_CODE)}
            className="p-2.5 rounded-xl text-white transition-all disabled:opacity-40 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff9f0a, #ff6b35)' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
