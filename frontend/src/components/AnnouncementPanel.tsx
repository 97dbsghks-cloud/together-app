import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Megaphone, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'

type Announcement = {
  id: string
  title: string
  content: string
  authorName: string
  createdAt: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

type Props = {
  onClose: () => void
  isAdmin: boolean
  userName: string
  onRead: (ids: string[]) => void
}

export default function AnnouncementPanel({ onClose, isAdmin, userName, onRead }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    const res = await axios.get<{ announcements: Announcement[] }>(`${API}/api/announcements`)
    setAnnouncements(res.data.announcements)
    onRead(res.data.announcements.map(a => a.id))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return
    const announcement: Announcement = {
      id: uuidv4(),
      title: title.trim(),
      content: content.trim(),
      authorName: userName,
      createdAt: new Date().toISOString(),
    }
    await axios.post(`${API}/api/announcements`, announcement)
    setAnnouncements(prev => [announcement, ...prev])
    setTitle('')
    setContent('')
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    await axios.delete(`${API}/api/announcements/${id}`)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 260 }}
      className="w-80 flex-shrink-0 h-full flex flex-col bg-white border-l border-gray-100"
      style={{ boxShadow: '-4px 0 20px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff6b35, #ff9f0a)' }}
          >
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">공지사항</h3>
            <p className="text-[10px] text-gray-400">관리자 공지 및 업데이트</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Write form (admin only) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-100 flex-shrink-0"
          >
            <div className="px-4 py-3 space-y-2 bg-orange-50/40">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">새 공지 작성</p>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="제목"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              />
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="공지 내용을 입력하세요..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowForm(false); setTitle(''); setContent('') }}
                  className="flex-1 py-2 text-xs font-medium text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !content.trim()}
                  className="flex-1 py-2 text-xs font-semibold text-white rounded-xl transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #ff9f0a)' }}
                >
                  등록
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {announcements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(255,107,53,0.1)' }}
            >
              <Megaphone className="w-5 h-5" style={{ color: '#ff6b35' }} />
            </div>
            <p className="text-[12px] text-gray-400 font-medium">공지사항이 없습니다</p>
          </div>
        )}
        {announcements.map(a => (
          <div
            key={a.id}
            className="rounded-2xl border border-gray-100 overflow-hidden bg-white"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div
              className="flex items-start justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50/60 transition-colors"
              onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg, #ff6b35, #ff9f0a)' }}
                  >
                    공지
                  </span>
                  <span className="text-[10px] text-gray-400">{a.authorName} · {formatDate(a.createdAt)}</span>
                </div>
                <p className="text-[13px] font-semibold text-gray-900 truncate">{a.title}</p>
                {expandedId !== a.id && (
                  <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{a.content}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(a.id) }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {expandedId === a.id
                  ? <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
                }
              </div>
            </div>
            <AnimatePresence>
              {expandedId === a.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-gray-50">
                    <p className="text-[13px] text-gray-600 leading-relaxed pt-3 whitespace-pre-wrap">{a.content}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
