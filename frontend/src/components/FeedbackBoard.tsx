import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Send, ChevronDown, ChevronUp, Trash2, Shield } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import clsx from 'clsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'
const ADMIN_CODE = '0000'

type Comment = {
  id: string
  author: string
  content: string
  createdAt: string
  isAdmin: boolean
}

type Post = {
  id: string
  title: string
  content: string
  author: string
  createdAt: string
  status: 'pending' | 'reviewing' | 'planned' | 'done'
  comments: Comment[]
}

const STATUS_META = {
  pending:   { label: '검토 대기', color: '#636366', bg: 'rgba(99,99,102,0.1)' },
  reviewing: { label: '검토 중',   color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)' },
  planned:   { label: '반영 예정', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  done:      { label: '반영 완료', color: '#34c759', bg: 'rgba(52,199,89,0.1)' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ── New Feedback Modal ─────────────────────────────────────────────────────
function NewPostModal({ onClose, onSubmit, userName }: { onClose: () => void; onSubmit: (p: Post) => void; userName: string }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [author] = useState(userName)

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return
    onSubmit({
      id: uuidv4(),
      title: title.trim(),
      content: content.trim(),
      author: author.trim() || '익명',
      createdAt: new Date().toISOString(),
      status: 'pending',
      comments: [],
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="t-surface rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.28)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b t-border">
          <h3 className="text-sm font-bold t-text">피드백 남기기</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg t-text3 t-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[10px] font-semibold t-text3 uppercase tracking-widest block mb-1.5">제목</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="기능 제안 또는 버그 제목"
              className="w-full px-3.5 py-2.5 t-surface2 border t-border rounded-xl text-sm t-text focus:border-blue-400 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold t-text3 uppercase tracking-widest block mb-1.5">내용</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              placeholder="어떤 기능이 있으면 좋을까요? 또는 어떤 문제가 있나요?"
              className="w-full px-3.5 py-2.5 t-surface2 border t-border rounded-xl text-sm t-text focus:border-blue-400 outline-none transition-all resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold t-text3 uppercase tracking-widest block mb-1.5">작성자</label>
            <input
              value={author}
              readOnly
              className="w-full px-3.5 py-2.5 t-surface2 border t-border rounded-xl text-sm t-text2 outline-none cursor-default"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t t-border t-surface2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium t-text2 rounded-xl t-hover transition-colors">취소</button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            제출하기
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Single Post Card ───────────────────────────────────────────────────────
function PostCard({
  post,
  onAddComment,
  onStatusChange,
  onDelete,
  userName,
  isAdminUser,
}: {
  post: Post
  onAddComment: (postId: string, comment: Comment) => void
  onStatusChange: (postId: string, status: Post['status']) => void
  onDelete: (postId: string) => void
  userName: string
  isAdminUser: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentAuthor] = useState(userName)
  const [isAdmin, setIsAdmin] = useState(isAdminUser)
  const [adminCode, setAdminCode] = useState('')
  const [statusCode, setStatusCode] = useState('')
  const [showStatusPanel, setShowStatusPanel] = useState(false)
  const commentEndRef = useRef<HTMLDivElement>(null)
  const status = STATUS_META[post.status]

  const submitComment = () => {
    if (!commentText.trim()) return
    if (isAdmin && adminCode !== ADMIN_CODE) return
    onAddComment(post.id, {
      id: uuidv4(),
      author: isAdmin ? '관리자' : (commentAuthor.trim() || '익명'),
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
      isAdmin,
    })
    setCommentText('')
    setAdminCode('')
    setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const applyStatus = (newStatus: Post['status']) => {
    if (statusCode !== ADMIN_CODE) return
    onStatusChange(post.id, newStatus)
    setShowStatusPanel(false)
    setStatusCode('')
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="t-surface rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}
    >
      {/* Post Header */}
      <div
        className="px-5 py-4 cursor-pointer t-hover transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: status.color, backgroundColor: status.bg }}
              >
                {status.label}
              </span>
              <span className="text-[10px] t-text3">{post.author} · {formatDate(post.createdAt)}</span>
              {post.comments.length > 0 && (
                <span className="text-[10px] t-text3">댓글 {post.comments.length}</span>
              )}
            </div>
            <h3 className="text-[14px] font-semibold t-text leading-snug">{post.title}</h3>
            {!expanded && (
              <p className="text-[12px] t-text3 mt-1 line-clamp-1">{post.content}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setShowStatusPanel(v => !v) }}
              className="p-1.5 rounded-lg t-text3 hover:text-blue-400 hover:bg-blue-50/20 transition-all"
              title="상태 변경 (관리자)"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(post.id) }}
              className="p-1.5 rounded-lg t-text3 hover:text-red-400 hover:bg-red-50/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 t-text3" /> : <ChevronDown className="w-4 h-4 t-text3" />}
          </div>
        </div>
      </div>

      {/* Status change panel (admin) */}
      <AnimatePresence>
        {showStatusPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t t-border"
          >
            <div className="px-5 py-3 t-surface2 space-y-2">
              <p className="text-[10px] font-semibold t-text3 uppercase tracking-widest">관리자 코드 입력 후 상태 변경</p>
              <input
                type="password"
                maxLength={4}
                value={statusCode}
                onChange={e => setStatusCode(e.target.value)}
                placeholder="코드 입력"
                className="w-28 px-2.5 py-1.5 text-xs border t-border rounded-lg t-surface t-text outline-none focus:border-blue-400 text-center tracking-widest"
              />
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(STATUS_META) as [Post['status'], typeof STATUS_META[keyof typeof STATUS_META]][]).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => applyStatus(key)}
                    disabled={statusCode !== ADMIN_CODE}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all disabled:opacity-30"
                    style={{ color: meta.color, backgroundColor: meta.bg }}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Post body */}
            <div className="px-5 pb-4 border-t t-border">
              <p className="text-[13px] t-text2 leading-relaxed pt-3 whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Comments */}
            {post.comments.length > 0 && (
              <div className="px-5 pb-3 space-y-2.5 border-t t-border">
                <p className="text-[10px] font-semibold t-text3 uppercase tracking-widest pt-3">댓글 {post.comments.length}개</p>
                {post.comments.map(c => (
                  <div key={c.id} className={clsx('flex gap-2.5', c.isAdmin ? 'flex-row-reverse' : '')}>
                    <div
                      className={clsx(
                        'max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed',
                        c.isAdmin
                          ? 'text-white rounded-tr-md'
                          : 't-surface2 t-text rounded-tl-md border t-border'
                      )}
                      style={c.isAdmin ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}
                    >
                      <div className={clsx('flex items-center gap-1.5 mb-1', c.isAdmin ? 'justify-end' : '')}>
                        {c.isAdmin && <Shield className="w-2.5 h-2.5 text-white/70" />}
                        <span className={clsx('text-[10px] font-semibold', c.isAdmin ? 'text-white/80' : 't-text3')}>
                          {c.author}
                        </span>
                        <span className={clsx('text-[9px]', c.isAdmin ? 'text-white/60' : 't-text3')}>
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={commentEndRef} />
              </div>
            )}

            {/* Comment input */}
            <div className="px-5 pb-4 pt-3 border-t t-border space-y-2">
              {/* Admin toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAdmin(v => !v)}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                    isAdmin ? 'text-white' : 't-text3 t-hover t-surface2'
                  )}
                  style={isAdmin ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}
                >
                  <Shield className="w-3 h-3" />
                  관리자로 댓글
                </button>
                {isAdmin && (
                  <input
                    type="password"
                    maxLength={4}
                    value={adminCode}
                    onChange={e => setAdminCode(e.target.value)}
                    placeholder="코드"
                    className="w-20 px-2 py-1 text-xs border t-border rounded-lg t-surface t-text outline-none focus:border-blue-400 text-center tracking-widest"
                  />
                )}
                {!isAdmin && (
                  <input
                    value={commentAuthor}
                    readOnly
                    className="flex-1 px-2.5 py-1 text-xs border t-border rounded-lg t-surface2 t-text2 outline-none cursor-default"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                  placeholder="댓글을 입력하세요..."
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border t-border rounded-xl t-surface2 t-text outline-none focus:border-blue-400 transition-all resize-none"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentText.trim() || (isAdmin && adminCode !== ADMIN_CODE)}
                  className="px-3 py-2 rounded-xl text-white transition-all disabled:opacity-30 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main FeedbackBoard ─────────────────────────────────────────────────────
export default function FeedbackBoard({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [filterStatus, setFilterStatus] = useState<Post['status'] | 'all'>('all')

  const loadPosts = async () => {
    const res = await axios.get<{ feedback: Post[] }>(`${API}/api/feedback`)
    setPosts(res.data.feedback)
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  const handleNewPost = async (post: Post) => {
    await axios.post(`${API}/api/feedback`, post)
    setPosts(prev => [post, ...prev])
    setShowNew(false)
  }

  const handleAddComment = async (postId: string, comment: Comment) => {
    await axios.post(`${API}/api/feedback/${postId}/comments`, comment)
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
    ))
  }

  const handleStatusChange = async (postId: string, status: Post['status']) => {
    await axios.patch(`${API}/api/feedback/${postId}/status`, { status })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p))
  }

  const handleDelete = async (postId: string) => {
    await axios.delete(`${API}/api/feedback/${postId}`)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const STATUS_ORDER: Post['status'][] = ['pending', 'reviewing', 'planned', 'done']
  const filtered = (filterStatus === 'all' ? posts : posts.filter(p => p.status === filterStatus))
    .slice().sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold t-text">이용자 피드백</h2>
            <p className="text-[11px] t-text3 mt-0.5">기능 제안, 버그 리포트 등 자유롭게 남겨주세요</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Plus className="w-4 h-4" />
            피드백 남기기
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: 'var(--t-surface2)' }}>
          {([['all', '전체'], ['pending', '검토 대기'], ['reviewing', '검토 중'], ['planned', '반영 예정'], ['done', '반영 완료']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className="relative px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors whitespace-nowrap"
              style={{ color: filterStatus === key ? 'var(--t-text)' : 'var(--t-text3)' }}
            >
              {filterStatus === key && (
                <motion.span
                  layoutId="feedback-tab-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'var(--t-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Post list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="t-text3 text-[13px]">아직 피드백이 없습니다</p>
            <p className="t-text3 text-[11px] mt-1 opacity-60">첫 번째 피드백을 남겨보세요!</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onAddComment={handleAddComment}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                userName={userName}
                isAdminUser={isAdmin}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* New post modal */}
      <AnimatePresence>
        {showNew && <NewPostModal onClose={() => setShowNew(false)} onSubmit={handleNewPost} userName={userName} />}
      </AnimatePresence>
    </div>
  )
}
