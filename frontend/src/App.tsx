import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, rectIntersection,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Bot, Loader2, Trash2, Edit2, Check, LogOut, UserCog, Megaphone,
  Home, RefreshCw, Sun, Moon,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import clsx from 'clsx'

import KanbanColumn from './components/KanbanColumn'
import TaskCard from './components/TaskCard'
import AddTaskModal from './components/AddTaskModal'
import AiPanel from './components/AiPanel'
import TaskEditModal from './components/TaskEditModal'
import CalendarView from './components/CalendarView'
import FeedbackBoard from './components/FeedbackBoard'
import ChatPanel from './components/ChatPanel'
import AuthPage from './components/AuthPage'
import UserManagementPanel from './components/UserManagementPanel'
import AnnouncementPanel from './components/AnnouncementPanel'
import MilestoneView from './components/MilestoneView'
import RememberView from './components/RememberView'
import MeetingView from './components/MeetingView'
import DashboardView from './components/DashboardView'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import ConfettiEffect from './components/ConfettiEffect'
import type { MeetingNote } from './components/MeetingView'

export type TaskPriority = 'low' | 'medium' | 'high'

export type ChatMessage = {
  id: string
  author: string
  content: string
  createdAt: string
  isAdmin: boolean
}

export type CalendarEvent = {
  id: string
  title: string
  date: string
  endDate?: string
  color: string
  description?: string
  important?: boolean
}

export type Task = {
  id: string
  title: string
  description?: string
  columnId: string
  dueDate?: string
  assignee?: string
  priority?: TaskPriority
  tags?: string[]
  checklist?: { id: string; text: string; done: boolean }[]
}

export type Column = {
  id: string
  title: string
  color: string
}

export type ProjectMeta = {
  id: string
  name: string
  emoji: string
  abbr?: string
  projectCode?: string
  avatarColor?: string
  taskCount: number
  doneCount: number
}

export type RememberItem = {
  id: string
  content: string
  importance?: number  // 1~3
  stage: string
  assignee: string
  deadline: string
  done?: boolean
}

export type GanttBar = {
  id: string
  startWeek: number
  endWeek: number
  label?: string
  color?: string
}

export type GanttMilestone = {
  id: string
  week: number
  label: string
  color?: string
}

export type GanttRow = {
  id: string
  name: string
  indent: number
  isGroup: boolean
  bars: GanttBar[]
  milestones: GanttMilestone[]
}

export type GanttConfig = {
  startDate: string
  weekCount: number
  rows: GanttRow[]
}

export type ProjectBoard = {
  id: string
  name: string
  emoji: string
  abbr?: string
  projectCode?: string
  avatarColor?: string
  columns: Column[]
  tasks: Task[]
  events: CalendarEvent[]
  messages: ChatMessage[]
  gantt?: GanttConfig
  remember?: RememberItem[]
  meetings?: MeetingNote[]
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  )
}

function AuthGate() {
  const { user } = useAuth()
  if (!user) return <AuthPage />
  return <AppInner />
}

type TabKey = 'chat' | 'project-calendar' | 'board' | 'milestone' | 'meeting'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
]

function getDefaultAbbr(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function ProjectMetaEditModal({ proj, onClose, onSave }: {
  proj: ProjectMeta
  onClose: () => void
  onSave: (name: string, abbr: string, projectCode: string, avatarColor: string) => void
}) {
  const [name, setName] = useState(proj.name)
  const [abbr, setAbbr] = useState(proj.abbr ?? getDefaultAbbr(proj.name))
  const [projectCode, setProjectCode] = useState(proj.projectCode ?? '')
  const [avatarColor, setAvatarColor] = useState(proj.avatarColor ?? AVATAR_COLORS[0])

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
        className="t-surface rounded-2xl w-full max-w-xs overflow-hidden"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.28)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b t-border">
          <h3 className="text-sm font-bold t-text">프로젝트 카드 편집</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg t-text3 t-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
              style={{ background: avatarColor }}>
              {abbr.slice(0, 2).toUpperCase() || '??'}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold t-text3 uppercase tracking-widest block mb-1.5">프로젝트명</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="프로젝트 이름"
              className="w-full px-3.5 py-2.5 t-surface2 border t-border rounded-xl text-sm t-text focus:border-blue-400 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold t-text3 uppercase tracking-widest block mb-1.5">약칭 (2자)</label>
            <input
              value={abbr}
              onChange={e => setAbbr(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              className="w-full px-3.5 py-2.5 t-surface2 border t-border rounded-xl text-sm t-text focus:border-blue-400 outline-none transition-all text-center tracking-widest font-bold text-lg"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold t-text3 uppercase tracking-widest block mb-1.5">프로젝트 번호</label>
            <input
              value={projectCode}
              onChange={e => setProjectCode(e.target.value)}
              placeholder="예: P2024-001"
              className="w-full px-3.5 py-2.5 t-surface2 border t-border rounded-xl text-sm t-text focus:border-blue-400 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold t-text3 uppercase tracking-widest block mb-2">색상</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                  style={{
                    background: c,
                    boxShadow: avatarColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t t-border t-surface2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium t-text2 rounded-xl t-hover transition-colors">취소</button>
          <button
            onClick={() => onSave(name, abbr, projectCode, avatarColor)}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            저장
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AppInner() {
  const { user: _user, logout } = useAuth()
  const user = _user!
  const { theme, toggle: toggleTheme } = useTheme()
  const [userMgmtOpen, setUserMgmtOpen] = useState(false)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const getReadIds = () => {
    const s = localStorage.getItem(`together_read_announcements_${user.id}`)
    return s ? (JSON.parse(s) as string[]) : []
  }

  const markRead = (ids: string[]) => {
    const prev = getReadIds()
    const merged = Array.from(new Set([...prev, ...ids]))
    localStorage.setItem(`together_read_announcements_${user.id}`, JSON.stringify(merged))
    setUnreadCount(0)
  }

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'
        const res = await axios.get<{ announcements: { id: string }[] }>(`${API}/api/announcements`)
        const allIds = res.data.announcements.map(a => a.id)
        const readIds = getReadIds()
        setUnreadCount(allIds.filter(id => !readIds.includes(id)).length)
      } catch {}
    }
    fetchUnread()
  }, [])

  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [board, setBoard] = useState<ProjectBoard | null>(null)
  const [loadingProject, setLoadingProject] = useState(false)

  const [view, setView] = useState<'board' | 'chat' | 'project-calendar' | 'global-calendar' | 'feedback' | 'milestone' | 'meeting' | 'dashboard'>('dashboard')
  const viewRef = useRef(view)
  viewRef.current = view
  const [boardTab, setBoardTab] = useState<'todo' | 'remember'>('todo')
  const [syncing, setSyncing] = useState(false)
  const [allBoards, setAllBoards] = useState<Record<string, ProjectBoard>>({})

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeOverColId, setActiveOverColId] = useState<string | null>(null)
  const [addingToCol, setAddingToCol] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [aiOpen, setAiOpen] = useState(false)

  const [confettiTrigger, setConfettiTrigger] = useState(false)

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [editingMetaProj, setEditingMetaProj] = useState<ProjectMeta | null>(null)
  const [deleteCode, setDeleteCode] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    }
  }))

  // Load project list — filtered by userId for members
  const loadProjects = useCallback(async () => {
    const params = (user.role === 'admin' || user.role === 'sub_admin') ? {} : { userId: user.id }
    const [projRes, orderRes] = await Promise.all([
      axios.get<{ projects: ProjectMeta[] }>(`${API}/api/projects`, { params }),
      axios.get<{ order: string[] }>(`${API}/api/projects/order`).catch(() => ({ data: { order: [] as string[] } })),
    ])
    const list = projRes.data.projects
    const order = orderRes.data.order
    const sorted = order.length > 0
      ? [...list].sort((a, b) => {
          const ai = order.indexOf(a.id)
          const bi = order.indexOf(b.id)
          if (ai === -1 && bi === -1) return 0
          if (ai === -1) return 1
          if (bi === -1) return -1
          return ai - bi
        })
      : list
    setProjects(sorted)
    return sorted
  }, [user.id, user.role])

  useEffect(() => {
    loadProjects().then(list => {
      if (list.length > 0 && !activeProjectId) {
        setActiveProjectId(list[0].id)
      }
    })
  }, [])

  // Load board when project changes
  useEffect(() => {
    if (!activeProjectId) return
    setLoadingProject(true)
    axios.get<ProjectBoard>(`${API}/api/projects/${activeProjectId}`)
      .then(res => { setBoard(res.data); setLoadingProject(false) })
      .catch(() => setLoadingProject(false))
  }, [activeProjectId])

  // Sync current project
  const syncProject = useCallback(async () => {
    if (!activeProjectId) return
    setSyncing(true)
    try {
      const res = await axios.get<ProjectBoard>(`${API}/api/projects/${activeProjectId}`)
      setBoard(res.data)
    } finally {
      setSyncing(false)
    }
  }, [activeProjectId])

  // Chat polling — every 0.5s when on chat tab
  useEffect(() => {
    if (view !== 'chat' || !activeProjectId) return
    const id = setInterval(async () => {
      try {
        const res = await axios.get<ProjectBoard>(`${API}/api/projects/${activeProjectId}`)
        setBoard(prev => {
          if (!prev) return res.data
          // only update messages to avoid overwriting unsaved local edits
          return { ...prev, messages: res.data.messages }
        })
      } catch {}
    }, 500)
    return () => clearInterval(id)
  }, [view, activeProjectId])

  // Real-time polling — every 5s for all non-chat project tabs
  useEffect(() => {
    const projectTabs = ['board', 'project-calendar', 'meeting', 'milestone', 'remember']
    if (!projectTabs.includes(view) || !activeProjectId) return
    const id = setInterval(async () => {
      try {
        const res = await axios.get<ProjectBoard>(`${API}/api/projects/${activeProjectId}`)
        setBoard(res.data)
      } catch {}
    }, 5000)
    return () => clearInterval(id)
  }, [view, activeProjectId])

  const saveBoard = useCallback((updatedBoard: ProjectBoard) => {
    axios.put(`${API}/api/projects/${updatedBoard.id}`, updatedBoard)
      .then(() => loadProjects())
      .catch(console.error)
  }, [loadProjects])

  // Load all boards for calendar view
  const loadAllBoards = useCallback(async (list: ProjectMeta[]) => {
    const results = await Promise.all(list.map(p => axios.get<ProjectBoard>(`${API}/api/projects/${p.id}`)))
    const map: Record<string, ProjectBoard> = {}
    results.forEach(r => { map[r.data.id] = r.data })
    setAllBoards(map)
  }, [])

  // Load allBoards only when project list actually changes (new/deleted projects),
  // NOT on every view switch — prevents overwriting locally-correct state with stale server data
  const loadedProjectIdsRef = useRef('')
  useEffect(() => {
    if ((view === 'global-calendar' || view === 'dashboard') && projects.length > 0) {
      const ids = projects.map(p => p.id).sort().join(',')
      if (ids !== loadedProjectIdsRef.current) {
        loadedProjectIdsRef.current = ids
        loadAllBoards(projects)
      }
    }
  }, [view, projects, loadAllBoards])

  // Real-time polling — every 5s for dashboard / global calendar (all boards)
  useEffect(() => {
    if (view !== 'dashboard' && view !== 'global-calendar') return
    if (projects.length === 0) return
    const id = setInterval(async () => {
      try {
        await loadAllBoards(projects)
      } catch {}
    }, 5000)
    return () => clearInterval(id)
  }, [view, projects, loadAllBoards])

  // Calendar event CRUD — prefer boardRef.current (latest polled state) over potentially stale allBoards
  const applyEventUpdate = useCallback((projectId: string, updater: (b: ProjectBoard) => ProjectBoard) => {
    const base = (boardRef.current?.id === projectId ? boardRef.current : null) ?? allBoards[projectId] ?? null
    if (!base) return
    const updated = updater(base)
    axios.put(`${API}/api/projects/${projectId}`, updated).catch(console.error)
    setBoard(prev => prev?.id === projectId ? updated : prev)
    // always update allBoards locally so dashboard reflects changes immediately
    setAllBoards(prev => ({ ...prev, [projectId]: updated }))
  }, [allBoards])

  const addEvent = useCallback((projectId: string, event: CalendarEvent) => {
    applyEventUpdate(projectId, b => ({ ...b, events: [...(b.events ?? []), event] }))
  }, [applyEventUpdate])

  const deleteEvent = useCallback((projectId: string, eventId: string) => {
    applyEventUpdate(projectId, b => ({ ...b, events: (b.events ?? []).filter(e => e.id !== eventId) }))
  }, [applyEventUpdate])

  const updateEvent = useCallback((projectId: string, event: CalendarEvent) => {
    applyEventUpdate(projectId, b => ({ ...b, events: (b.events ?? []).map(e => e.id === event.id ? event : e) }))
  }, [applyEventUpdate])

  const addChatMessage = useCallback((msg: ChatMessage) => {
    if (!activeProjectId || !board) return
    axios.post(`${API}/api/projects/${activeProjectId}/messages`, msg).catch(console.error)
    setBoard(prev => prev ? { ...prev, messages: [...(prev.messages ?? []), msg] } : prev)
  }, [activeProjectId, board])

  const deleteChatMessage = useCallback((msgId: string) => {
    if (!activeProjectId || !board) return
    axios.delete(`${API}/api/projects/${activeProjectId}/messages/${msgId}`).catch(console.error)
    setBoard(prev => prev ? { ...prev, messages: (prev.messages ?? []).filter(m => m.id !== msgId) } : prev)
  }, [activeProjectId, board])

  const boardRef = useRef<ProjectBoard | null>(null)
  useEffect(() => { boardRef.current = board }, [board])

  const handleDragStart = (e: DragStartEvent) => {
    const task = board?.tasks.find(t => t.id === e.active.id)
    if (task) setActiveTask(task)
  }

  const getColId = (id: string, b: ProjectBoard): string | null => {
    if (b.columns.find(c => c.id === id)) return id
    const task = b.tasks.find(t => t.id === id)
    return task?.columnId ?? null
  }

  const handleDragOver = (e: DragOverEvent) => {
    if (!e.over || !board) return
    const draggedId = e.active.id as string
    const overId = e.over.id as string
    const newColId = getColId(overId, board)
    setActiveOverColId(newColId)

    // 크로스 컬럼 이동: 드래그 중 실시간으로 columnId 변경 (미리보기)
    const dragged = board.tasks.find(t => t.id === draggedId)
    if (!dragged || !newColId || dragged.columnId === newColId) return
    setBoard(prev => {
      if (!prev) return prev
      return { ...prev, tasks: prev.tasks.map(t => t.id === draggedId ? { ...t, columnId: newColId } : t) }
    })
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null)
    setActiveOverColId(null)
    const current = boardRef.current
    if (!e.over || !current) return

    const draggedId = e.active.id as string
    const overId = e.over.id as string

    // over가 태스크 위라면 → 같은 컬럼 내 순서 재정렬
    const overTask = current.tasks.find(t => t.id === overId)
    if (overTask && draggedId !== overId) {
      const oldIndex = current.tasks.findIndex(t => t.id === draggedId)
      const newIndex = current.tasks.findIndex(t => t.id === overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(current.tasks, oldIndex, newIndex)
        setBoard(prev => prev ? { ...prev, tasks: reordered } : prev)
        axios.patch(`${API}/api/projects/${current.id}/tasks-order`, { order: reordered.map(t => t.id) }).catch(console.error)
        return
      }
    }

    // 크로스 컬럼 이동 — handleDragOver에서 columnId 이미 변경됨 → 변경된 task만 PATCH
    const draggedTask = current.tasks.find(t => t.id === draggedId)
    if (draggedTask) {
      axios.patch(`${API}/api/projects/${current.id}/tasks/${draggedId}`, draggedTask).catch(console.error)
      // 이동 이벤트 기록
      const originalTask = activeTask
      if (originalTask && originalTask.columnId !== draggedTask.columnId) {
        const destCol = current.columns.find(c => c.id === draggedTask.columnId)
        if (destCol && destCol.title.trim() === '완료') {
          setConfettiTrigger(t => !t)
        }
      }
    }
  }

  const addTask = (colId: string, taskData: Partial<Task>) => {
    if (!board) return
    const newTask: Task = { id: uuidv4(), title: taskData.title || '새 태스크', columnId: colId, ...taskData }
    setBoard(prev => prev ? { ...prev, tasks: [...prev.tasks, newTask] } : prev)
    axios.post(`${API}/api/projects/${board.id}/tasks`, newTask).catch(console.error)
    setAddingToCol(null)
  }

  const deleteTask = (id: string) => {
    if (!board) return
    setBoard(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== id) } : prev)
    axios.delete(`${API}/api/projects/${board.id}/tasks/${id}`).catch(console.error)
  }

  const updateTask = (updatedTask: Task) => {
    if (!board) return
    setBoard(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) } : prev)
    axios.patch(`${API}/api/projects/${board.id}/tasks/${updatedTask.id}`, updatedTask).catch(console.error)
  }

  const addColumn = () => {
    if (!board) return
    const colors = ['#af52de', '#ff2d55', '#5ac8fa', '#ff6b35']
    const newCol: Column = { id: uuidv4(), title: '새 열', color: colors[board.columns.length % colors.length] }
    setBoard(prev => prev ? { ...prev, columns: [...prev.columns, newCol] } : prev)
    axios.post(`${API}/api/projects/${board.id}/columns`, newCol).catch(console.error)
  }

  const updateColumnTitle = (id: string, title: string) => {
    if (!board) return
    const col = board.columns.find(c => c.id === id)
    if (!col) return
    const updated = { ...col, title }
    setBoard(prev => prev ? { ...prev, columns: prev.columns.map(c => c.id === id ? updated : c) } : prev)
    axios.patch(`${API}/api/projects/${board.id}/columns/${id}`, updated).catch(console.error)
  }

  const deleteColumn = (id: string) => {
    if (!board) return
    setBoard(prev => prev ? { ...prev, columns: prev.columns.filter(c => c.id !== id), tasks: prev.tasks.filter(t => t.columnId !== id) } : prev)
    axios.delete(`${API}/api/projects/${board.id}/columns/${id}`).catch(console.error)
  }

  const saveGantt = useCallback((gantt: GanttConfig) => {
    if (!board) return
    const updated = { ...board, gantt }
    setBoard(updated)
    saveBoard(updated)
  }, [board, saveBoard])

  const saveRemember = useCallback((items: RememberItem[]) => {
    if (!board) return
    const updated = { ...board, remember: items }
    setBoard(updated)
    saveBoard(updated)
  }, [board, saveBoard])

  const saveMeetings = useCallback((meetings: MeetingNote[]) => {
    setBoard(prev => {
      if (!prev) return prev
      const updated = { ...prev, meetings }
      axios.put(`${API}/api/projects/${updated.id}`, updated).then(() => loadProjects()).catch(console.error)
      return updated
    })
  }, [loadProjects])

  const addRememberFromMeeting = useCallback((item: RememberItem) => {
    setBoard(prev => {
      if (!prev) return prev
      const updated = { ...prev, remember: [...(prev.remember ?? []), item] }
      axios.put(`${API}/api/projects/${updated.id}`, updated).catch(console.error)
      return updated
    })
  }, [])

  const injectAiTasks = (newTasks: Partial<Task>[], colId: string) => {
    if (!board) return
    const created = newTasks.map(t => ({ id: uuidv4(), title: t.title || '태스크', columnId: colId, ...t } as Task))
    const updated = { ...board, tasks: [...board.tasks, ...created] }
    setBoard(updated)
    saveBoard(updated)
  }

  const createProject = async () => {
    if (!newProjectName.trim()) return
    await axios.post(`${API}/api/projects`, { name: newProjectName.trim(), emoji: '🏗️' })
    const list = await loadProjects()
    setActiveProjectId(list[list.length - 1].id)
    setShowNewProject(false)
    setNewProjectName('')
  }

  const deleteProject = async (id: string) => {
    await axios.delete(`${API}/api/projects/${id}`)
    const list = await loadProjects()
    if (activeProjectId === id) setActiveProjectId(list[0]?.id ?? null)
    setDeleteConfirm(null)
    setDeleteCode('')
  }

  // Project dropdown state
  const [projDropOpen, setProjDropOpen] = useState(false)
  const [projSearch, setProjSearch] = useState('')
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projSearch.toLowerCase()) ||
    (p.projectCode ?? '').toLowerCase().includes(projSearch.toLowerCase())
  )
  const activeProj = projects.find(p => p.id === activeProjectId)

  const NAV_ITEMS = [
    { key: 'dashboard',        label: '홈',       icon: <Home className="w-4 h-4" /> },
    { key: 'board',            label: '보드',     icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="10" rx="1"/><rect x="14" y="17" width="7" height="4" rx="1"/></svg> },
    { key: 'project-calendar', label: '캘린더',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { key: 'milestone',        label: '마일스톤', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg> },
    { key: 'meeting',          label: '회의록',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { key: 'chat',             label: '채팅',     icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { key: 'feedback',         label: '피드백',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> },
  ] as const

  const handleNavClick = (key: string) => {
    if (key === 'dashboard') { setView('dashboard'); return }
    if (key === 'feedback') { setView('feedback'); return }
    if (!activeProjectId && projects.length > 0) setActiveProjectId(projects[0].id)
    setView(key as TabKey)
  }

  const isNavActive = (key: string) => {
    if (key === 'dashboard') return view === 'dashboard'
    if (key === 'feedback') return view === 'feedback'
    if (key === 'board') return view === 'board' || view === ('board' as string)
    return view === key
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <p
            className="text-[22px] leading-none select-none"
            style={{
              color: 'var(--t-text)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
            }}
          >
            together
          </p>
        </div>

        {/* Project Selector */}
        <div className="px-3 mb-2 relative">
          <button
            onClick={() => { setProjDropOpen(v => !v); setProjSearch('') }}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all"
            style={{
              background: 'var(--t-surface2)',
              borderColor: projDropOpen ? 'var(--t-accent)' : 'var(--t-border)',
            }}
          >
            {activeProj ? (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                  style={{ background: activeProj.avatarColor ?? '#6366f1' }}>
                  {(activeProj.abbr ?? getDefaultAbbr(activeProj.name)).slice(0,2)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--t-text)' }}>{activeProj.name}</p>
                  {activeProj.projectCode && <p className="text-[11px] truncate" style={{ color: 'var(--t-text3)' }}>{activeProj.projectCode}</p>}
                </div>
              </>
            ) : (
              <span className="text-[13px] flex-1 text-left" style={{ color: 'var(--t-text3)' }}>프로젝트 선택</span>
            )}
            <svg className={clsx('w-4 h-4 flex-shrink-0 transition-transform', projDropOpen && 'rotate-180')} style={{ color: 'var(--t-text3)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <AnimatePresence>
            {projDropOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute left-3 right-3 top-full mt-1 z-50 rounded-2xl border overflow-hidden"
                style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' }}
              >
                {/* Search */}
                <div className="p-2 border-b" style={{ borderColor: 'var(--t-border)' }}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--t-surface2)' }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--t-text3)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      autoFocus
                      value={projSearch}
                      onChange={e => setProjSearch(e.target.value)}
                      placeholder="프로젝트 검색..."
                      className="flex-1 bg-transparent text-[12px] outline-none"
                      style={{ color: 'var(--t-text)' }}
                    />
                  </div>
                </div>

                {/* Project list */}
                <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                  {filteredProjects.map(proj => (
                    <div key={proj.id} className="flex items-center gap-1 group">
                      <button
                        onClick={() => {
                          setActiveProjectId(proj.id)
                          setProjDropOpen(false)
                          if (view === 'dashboard' || view === 'feedback' || view === 'global-calendar') setView('board')
                        }}
                        className={clsx(
                          'flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left',
                          proj.id === activeProjectId ? '' : 't-hover'
                        )}
                        style={proj.id === activeProjectId
                          ? { background: 'var(--t-active-bg)', color: 'var(--t-accent2)' }
                          : { color: 'var(--t-text)' }}
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: proj.avatarColor ?? '#6366f1' }}>
                          {(proj.abbr ?? getDefaultAbbr(proj.name)).slice(0,2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate">{proj.name}</p>
                          {proj.projectCode && <p className="text-[10px] truncate" style={{ color: 'var(--t-text3)' }}>{proj.projectCode}</p>}
                        </div>
                        {proj.id === activeProjectId && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                      </button>
                      {(user.role === 'admin' || user.role === 'sub_admin') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setProjDropOpen(false); setDeleteConfirm({ id: proj.id, name: proj.name }) }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
                          style={{ color: '#ef4444' }}
                          title="프로젝트 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {filteredProjects.length === 0 && (
                    <p className="text-[11px] text-center py-4" style={{ color: 'var(--t-text3)' }}>검색 결과 없음</p>
                  )}
                </div>

                {/* Add project */}
                {(user.role === 'admin' || user.role === 'sub_admin') && (
                  <div className="p-1.5 border-t" style={{ borderColor: 'var(--t-border)' }}>
                    <button
                      onClick={() => { setProjDropOpen(false); setShowNewProject(true) }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all t-hover"
                      style={{ color: 'var(--t-text3)' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      새 프로젝트 추가
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => { handleNavClick(item.key); setProjDropOpen(false) }}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                isNavActive(item.key) ? '' : 't-hover'
              )}
              style={isNavActive(item.key)
                ? { background: 'var(--t-active-bg)', color: 'var(--t-accent2)', fontWeight: 600 }
                : { color: 'var(--t-text2)' }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Separator */}
          <div className="pt-2 pb-1 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t-text3)' }}>관리</p>
          </div>

          {user.role === 'admin' && (
            <button
              onClick={() => { setUserMgmtOpen(v => !v); setProjDropOpen(false) }}
              className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all', userMgmtOpen ? '' : 't-hover')}
              style={userMgmtOpen ? { background: 'var(--t-active-bg)', color: 'var(--t-accent2)', fontWeight: 600 } : { color: 'var(--t-text2)' }}
            >
              <UserCog className="w-4 h-4 flex-shrink-0" />
              사용자 관리
            </button>
          )}
        </nav>

        {/* Bottom: user info */}
        <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid var(--t-border)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: user.role === 'admin' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : user.role === 'sub_admin' ? 'linear-gradient(135deg, #ff9500, #ff6b00)' : 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--t-text)' }}>{user.name}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--t-text3)' }}>{user.role === 'admin' ? '관리자' : user.role === 'sub_admin' ? '부관리자' : '멤버'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="w-7 h-7 flex items-center justify-center rounded-lg t-topbar-btn transition-colors"
                title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button onClick={logout} className="w-7 h-7 flex items-center justify-center rounded-lg t-topbar-btn transition-colors" title="로그아웃">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="h-[56px] flex-shrink-0 flex items-center justify-between px-6 border-b" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <div className="flex items-center gap-3">
            {/* Breadcrumb: Project > View */}
            {view !== 'dashboard' && view !== 'global-calendar' && activeProj ? (
              <div className="flex items-center gap-1.5 text-[13px]">
                <span style={{ color: 'var(--t-text3)' }}>{activeProj.name}</span>
                <svg className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--t-text3)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                <span className="font-semibold" style={{ color: 'var(--t-text)' }}>
                  {NAV_ITEMS.find(n => n.key === view)?.label ?? view}
                </span>
              </div>
            ) : (
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t-text)' }}>
                {view === 'dashboard' ? '홈' : view === 'global-calendar' ? '종합 캘린더' : ''}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={syncProject}
              disabled={syncing || !activeProjectId}
              className="w-8 h-8 flex items-center justify-center rounded-lg t-topbar-btn transition-colors disabled:opacity-30"
              title="동기화"
            >
              <RefreshCw className={clsx('w-4 h-4', syncing && 'animate-spin')} />
            </button>
            <button
              onClick={() => setAnnouncementOpen(v => !v)}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg t-topbar-btn transition-colors"
              style={announcementOpen ? { background: 'var(--t-active-bg)', color: 'var(--t-accent2)' } : {}}
              title="공지사항"
            >
              <Megaphone className="w-4 h-4" />
              {unreadCount > 0 && !announcementOpen && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
              )}
            </button>
            <button
              onClick={() => setAiOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={aiOpen
                ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }
                : { background: 'var(--t-surface2)', color: 'var(--t-text2)', border: '1px solid var(--t-border)' }}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI</span>
            </button>

            {/* Project card edit button — admin only */}
            {(user.role === 'admin' || user.role === 'sub_admin') && activeProj && view !== 'dashboard' && view !== 'feedback' && (
              <button
                onClick={() => {
                  const proj = activeProj
                  // trigger edit modal via state
                  setEditingMetaProj(proj)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg t-topbar-btn transition-colors"
                title="프로젝트 편집"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {view === 'feedback' ? (
            <FeedbackBoard userName={user.name} isAdmin={user.role === 'admin' || user.role === 'sub_admin'} />
          ) : view === 'dashboard' ? (
            <DashboardView
              allBoards={allBoards}
              projects={projects}
              activeProjectId={activeProjectId}
              isAdmin={user.role === 'admin' || user.role === 'sub_admin'}
              onSelectProject={(pid) => { setActiveProjectId(pid); setView('project-calendar') }}
              onAddEvent={addEvent}
              onDeleteEvent={deleteEvent}
              onUpdateEvent={updateEvent}
            />
          ) : view === 'global-calendar' ? (
            <CalendarView
              allBoards={allBoards}
              projects={projects}
              activeProjectId={activeProjectId}
              onAddEvent={addEvent}
              onDeleteEvent={deleteEvent}
              onUpdateEvent={updateEvent}
            />
          ) : view === 'project-calendar' && board ? (
            <CalendarView
              allBoards={{ [board.id]: board }}
              projects={projects}
              activeProjectId={activeProjectId}
              filterProjectId={activeProjectId ?? undefined}
              onAddEvent={addEvent}
              onDeleteEvent={deleteEvent}
              onUpdateEvent={updateEvent}
            />
          ) : view === 'chat' && board ? (
            <ChatPanel
              projectName={board.name}
              messages={board.messages ?? []}
              onClose={() => setView('board')}
              onSend={addChatMessage}
              onDelete={deleteChatMessage}
              fullPage
              userName={user.name}
            />
          ) : view === 'milestone' && board ? (
            <MilestoneView gantt={board.gantt} onChange={saveGantt} />
          ) : view === 'meeting' && board ? (
            <MeetingView
              meetings={board.meetings ?? []}
              columns={board.columns}
              onChange={saveMeetings}
              onSendToRemember={addRememberFromMeeting}
              onAddTask={addTask}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Board sub-tabs */}
              <div className="flex-shrink-0 flex items-center gap-2 px-5 border-b" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)', height: 56 }}>
                {(['todo', 'remember'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setBoardTab(t)}
                    className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all"
                    style={boardTab === t
                      ? { background: '#6366f1', color: '#fff' }
                      : { background: 'var(--t-surface2)', color: 'var(--t-text2)', border: '1px solid var(--t-border)' }}
                  >
                    {t === 'todo' ? '할 일' : '리멤버'}
                  </button>
                ))}
              </div>

              {boardTab === 'remember' && board ? (
                <RememberView items={board.remember ?? []} onChange={saveRemember} isAdmin={user.role === 'admin' || user.role === 'sub_admin'} userName={user.name} />
              ) : (
            <div className="flex-1 overflow-x-auto">
              {loadingProject ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : board ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={rectIntersection}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex gap-4 p-5 h-full items-start min-w-max">
                      {board.columns.map(col => (
                        <KanbanColumn
                          key={col.id}
                          col={col}
                          tasks={board.tasks.filter(t => t.columnId === col.id)}
                          allColumns={board.columns}
                          isOver={activeOverColId === col.id}
                          onDeleteColumn={deleteColumn}
                          onUpdateColumnTitle={updateColumnTitle}
                          onAddTask={() => setAddingToCol(col.id)}
                          onDeleteTask={deleteTask}
                          onUpdateTask={updateTask}
                          onClickTask={(task) => setEditingTask(task)}
                        />
                      ))}
                      <button
                        onClick={addColumn}
                        className="w-64 flex-shrink-0 h-14 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/40 transition-all text-[12px] font-medium"
                      >
                        <Plus className="w-4 h-4" /> 열 추가
                      </button>
                    </div>
                    <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                      {activeTask && <TaskCard task={activeTask} columns={board.columns} isDragging />}
                    </DragOverlay>
                  </DndContext>
                ) : null}
            </div>
              )}
            </div>
          )}
          {/* AI Panel — visible on all tabs */}
          <AnimatePresence>
            {aiOpen && board && (
              <AiPanel tasks={board.tasks} columns={board.columns} onClose={() => setAiOpen(false)} onInjectTasks={injectAiTasks} />
            )}
          </AnimatePresence>
          {/* Announcement Panel */}
          <AnimatePresence>
            {announcementOpen && (
              <AnnouncementPanel
                isAdmin={user.role === 'admin' || user.role === 'sub_admin'}
                userName={user.name}
                onClose={() => setAnnouncementOpen(false)}
                onRead={markRead}
              />
            )}
          </AnimatePresence>
          {/* User Management Panel (admin) */}
          <AnimatePresence>
            {userMgmtOpen && (user.role === 'admin') && (
              <UserManagementPanel projects={projects} onClose={() => setUserMgmtOpen(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Task Edit Modal */}
      <AnimatePresence>
        {editingTask && board && (
          <TaskEditModal
            task={editingTask}
            columns={board.columns}
            onClose={() => setEditingTask(null)}
            onSave={(updated) => { updateTask(updated); setEditingTask(null) }}
            onDelete={() => { deleteTask(editingTask.id); setEditingTask(null) }}
          />
        )}
      </AnimatePresence>

      {/* Task Add Modal */}
      <AnimatePresence>
        {addingToCol && board && (
          <AddTaskModal columnId={addingToCol} columns={board.columns} onClose={() => setAddingToCol(null)} onAdd={addTask} />
        )}
      </AnimatePresence>

      {/* Project Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setDeleteConfirm(null); setDeleteCode('') }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="t-surface rounded-2xl w-full max-w-sm p-6"
              style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}
            >
              {/* Warning icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Trash2 className="w-5 h-5" style={{ color: '#ef4444' }} />
              </div>

              <h3 className="text-base font-bold t-text text-center mb-1">프로젝트 삭제</h3>
              <p className="text-[12px] t-text2 text-center mb-1 leading-relaxed">
                <span className="font-semibold t-text">"{deleteConfirm.name}"</span> 프로젝트와
              </p>
              <p className="text-[12px] t-text2 text-center mb-5 leading-relaxed">
                모든 태스크가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>

              <div className="mb-4">
                <label className="text-[11px] font-semibold t-text3 uppercase tracking-wider block mb-1.5">
                  확인 코드 입력 <span className="text-red-400 normal-case font-bold">( 0000 )</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  maxLength={4}
                  value={deleteCode}
                  onChange={e => setDeleteCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && deleteCode === '0000' && deleteProject(deleteConfirm.id)}
                  placeholder="0000"
                  className="w-full px-3.5 py-2.5 t-surface2 border rounded-xl text-sm text-center font-bold tracking-[0.4em] t-text focus:outline-none transition-all"
                  style={{
                    borderColor: deleteCode === '0000' ? '#ef4444' : deleteCode.length > 0 ? '#ff9f0a' : 'var(--t-border)',
                    boxShadow: deleteCode === '0000' ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none',
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setDeleteConfirm(null); setDeleteCode('') }}
                  className="flex-1 py-2.5 text-sm font-medium t-text2 rounded-xl t-hover transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => deleteProject(deleteConfirm.id)}
                  disabled={deleteCode !== '0000'}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-30"
                  style={{ background: deleteCode === '0000' ? '#ff3b30' : '#ccc' }}
                >
                  삭제하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowNewProject(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="t-surface rounded-2xl w-full max-w-sm p-6" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.28)' }}
            >
              <h3 className="text-base font-bold t-text mb-4">새 프로젝트 만들기</h3>

              <div className="mb-5">
                <label className="text-[11px] font-semibold t-text3 uppercase tracking-wider block mb-1.5">프로젝트 이름</label>
                <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()}
                  placeholder="예: 서울 역세권 복합개발"
                  className="w-full px-3.5 py-2.5 t-surface2 border t-border rounded-xl text-sm t-text focus:outline-none focus:border-blue-400 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewProject(false)} className="flex-1 py-2.5 text-sm font-medium t-text2 rounded-xl t-hover transition-colors">취소</button>
                <button onClick={createProject} disabled={!newProjectName.trim()}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40"
                  style={{ background: newProjectName.trim() ? 'linear-gradient(135deg, #007aff, #5856d6)' : '#ccc' }}
                >시작하기</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Project Meta Edit Modal (triggered from topbar) */}
      <AnimatePresence>
        {editingMetaProj && (
          <ProjectMetaEditModal
            proj={editingMetaProj}
            onClose={() => setEditingMetaProj(null)}
            onSave={async (name, abbr, projectCode, avatarColor) => {
              const proj = editingMetaProj
              await Promise.all([
                axios.patch(`${API}/api/projects/${proj.id}/meta`, { abbr, projectCode, avatarColor }),
                name !== proj.name
                  ? (board?.id === proj.id
                    ? axios.put(`${API}/api/projects/${proj.id}`, { ...board, name, abbr, projectCode, avatarColor })
                    : axios.get<ProjectBoard>(`${API}/api/projects/${proj.id}`).then(r =>
                        axios.put(`${API}/api/projects/${proj.id}`, { ...r.data, name })
                      ))
                  : Promise.resolve(),
              ])
              setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, name, abbr, projectCode, avatarColor } : p))
              if (board?.id === proj.id) setBoard(prev => prev ? { ...prev, name, abbr, projectCode, avatarColor } : prev)
              setEditingMetaProj(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Confetti — Done 이벤트 시 폭죽 */}
      <ConfettiEffect trigger={confettiTrigger} />
    </div>
  )
}
