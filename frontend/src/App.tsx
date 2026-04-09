import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, rectIntersection,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Bot, Loader2, Trash2, Edit2, Check, CalendarDays, LogOut, UserCog, Megaphone, Users, GripVertical,
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
import { AuthProvider, useAuth } from './context/AuthContext'

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
  taskCount: number
  doneCount: number
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
  columns: Column[]
  tasks: Task[]
  events: CalendarEvent[]
  messages: ChatMessage[]
  gantt?: GanttConfig
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'


export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

function AuthGate() {
  const { user } = useAuth()
  if (!user) return <AuthPage />
  return <AppInner />
}

const ALL_TABS = [
  { key: 'chat',             label: '팀 채팅' },
  { key: 'project-calendar', label: '캘린더'  },
  { key: 'board',            label: '보드'    },
  { key: 'milestone',        label: '마일스톤' },
] as const

type TabKey = typeof ALL_TABS[number]['key']

function SortableTab({ id, label, isActive, isAdmin, onClick }: {
  id: string; label: string; isActive: boolean; isAdmin: boolean; onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      {...(isAdmin ? attributes : {})}
      {...(isAdmin ? listeners : {})}
      className={clsx(
        'px-4 h-full text-[12px] font-semibold transition-all border-b-2 -mb-px flex items-center gap-1.5',
        isActive ? 'text-blue-600 border-blue-500' : 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-300',
        isDragging && 'opacity-50',
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: isAdmin ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
      }}
    >
      {isAdmin && <GripVertical className="w-2.5 h-2.5 opacity-30" />}
      {label}
    </button>
  )
}

function SortableProjectItem({ proj, isActive, isAdmin, onSelect, onDeleteClick }: {
  proj: ProjectMeta
  isActive: boolean
  isAdmin: boolean
  onSelect: () => void
  onDeleteClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: proj.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        onClick={onSelect}
        className={clsx(
          'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-start gap-2.5',
          isAdmin ? 'pl-7' : '',
          isActive ? 'text-blue-700' : 'text-gray-600 hover:bg-gray-100'
        )}
        style={isActive ? { background: 'rgba(0,122,255,0.1)' } : {}}
      >
        <div className="flex-1 min-w-0 pr-5">
          <p className={clsx('text-[12px] font-semibold truncate leading-snug', isActive ? 'text-blue-700' : 'text-gray-700')}>{proj.name}</p>
        </div>
      </button>
      {/* Drag handle — admin only */}
      {isAdmin && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      {/* Delete button — admin only */}
      {isAdmin && (
        <button
          onClick={e => { e.stopPropagation(); onDeleteClick() }}
          className="absolute right-1.5 top-1.5 w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

function AppInner() {
  const { user: _user, logout } = useAuth()
  const user = _user!
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

  const [view, setView] = useState<'board' | 'chat' | 'project-calendar' | 'global-calendar' | 'feedback' | 'milestone'>(ALL_TABS[0].key as TabKey)
  const [allBoards, setAllBoards] = useState<Record<string, ProjectBoard>>({})

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeOverColId, setActiveOverColId] = useState<string | null>(null)
  const [addingToCol, setAddingToCol] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [aiOpen, setAiOpen] = useState(false)

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectName, setEditingProjectName] = useState(false)
  const [editNameVal, setEditNameVal] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteCode, setDeleteCode] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    }
  }))

  // Load project list — filtered by userId for members
  const loadProjects = useCallback(async () => {
    const params = user.role === 'admin' ? {} : { userId: user.id }
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

  const projectSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }))
  const tabSensors     = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Tab order — global, admin-controlled
  const allTabKeys = ALL_TABS.map(t => t.key)
  const [tabOrder, setTabOrder] = useState<string[]>(allTabKeys)
  const tabOrderRef = useRef<string[]>(allTabKeys)
  tabOrderRef.current = tabOrder   // always latest, no stale-closure risk

  useEffect(() => {
    axios.get<{ order: string[] }>(`${API}/api/settings/tab-order`)
      .then(res => {
        const saved = res.data.order.filter(k => (allTabKeys as string[]).includes(k))
        // prepend saved order, append any new tabs not yet in saved list
        const merged = [...saved, ...allTabKeys.filter(k => !saved.includes(k))]
        setTabOrder(merged)
        setView(merged[0] as TabKey)
      })
      .catch(() => {})
  }, []) // eslint-disable-line

  const orderedTabs = tabOrder
    .map(key => ALL_TABS.find(t => t.key === key))
    .filter(Boolean) as typeof ALL_TABS[number][]

  const handleTabDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const cur     = tabOrderRef.current
    const oldIdx  = cur.indexOf(active.id as string)
    const newIdx  = cur.indexOf(over.id   as string)
    if (oldIdx === -1 || newIdx === -1) return   // dropped outside valid tab
    const reordered = arrayMove(cur, oldIdx, newIdx)
    setTabOrder(reordered)
    try {
      await axios.put(`${API}/api/settings/tab-order`, { order: reordered })
    } catch (e) {
      console.error('[tab-order] save failed:', e)
    }
  }, [])  // useCallback with empty deps — safe because we use tabOrderRef

  const handleProjectDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = projects.findIndex(p => p.id === active.id)
    const newIndex = projects.findIndex(p => p.id === over.id)
    const reordered = arrayMove(projects, oldIndex, newIndex)
    setProjects(reordered)
    await axios.put(`${API}/api/projects/order`, { order: reordered.map(p => p.id) })
  }

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

  useEffect(() => {
    if (view === 'global-calendar' && projects.length > 0) {
      loadAllBoards(projects)
    }
  }, [view, projects, loadAllBoards])

  // Calendar event CRUD — allBoards may be empty in project-calendar view, so fall back to boardRef
  const applyEventUpdate = useCallback((projectId: string, updater: (b: ProjectBoard) => ProjectBoard) => {
    const base = allBoards[projectId] ?? (boardRef.current?.id === projectId ? boardRef.current : null)
    if (!base) return
    const updated = updater(base)
    axios.put(`${API}/api/projects/${projectId}`, updated).catch(console.error)
    setBoard(prev => prev?.id === projectId ? updated : prev)
    setAllBoards(prev => prev[projectId] ? { ...prev, [projectId]: updated } : prev)
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
        const updated = { ...current, tasks: reordered }
        setBoard(updated)
        saveBoard(updated)
        return
      }
    }

    // over가 컬럼 자체라면 → 크로스 컬럼 이동은 handleDragOver에서 이미 처리됨 → 저장만
    saveBoard(current)
  }

  const addTask = (colId: string, taskData: Partial<Task>) => {
    if (!board) return
    const newTask: Task = { id: uuidv4(), title: taskData.title || '새 태스크', columnId: colId, ...taskData }
    const updated = { ...board, tasks: [...board.tasks, newTask] }
    setBoard(updated)
    saveBoard(updated)
    setAddingToCol(null)
  }

  const deleteTask = (id: string) => {
    if (!board) return
    const updated = { ...board, tasks: board.tasks.filter(t => t.id !== id) }
    setBoard(updated)
    saveBoard(updated)
  }

  const updateTask = (updatedTask: Task) => {
    if (!board) return
    const updated = { ...board, tasks: board.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) }
    setBoard(updated)
    saveBoard(updated)
  }

  const addColumn = () => {
    if (!board) return
    const colors = ['#af52de', '#ff2d55', '#5ac8fa', '#ff6b35']
    const newCol: Column = { id: uuidv4(), title: '새 열', color: colors[board.columns.length % colors.length] }
    const updated = { ...board, columns: [...board.columns, newCol] }
    setBoard(updated)
    saveBoard(updated)
  }

  const updateColumnTitle = (id: string, title: string) => {
    if (!board) return
    const updated = { ...board, columns: board.columns.map(c => c.id === id ? { ...c, title } : c) }
    setBoard(updated)
    saveBoard(updated)
  }

  const deleteColumn = (id: string) => {
    if (!board) return
    const updated = { ...board, columns: board.columns.filter(c => c.id !== id), tasks: board.tasks.filter(t => t.columnId !== id) }
    setBoard(updated)
    saveBoard(updated)
  }

  const saveGantt = useCallback((gantt: GanttConfig) => {
    if (!board) return
    const updated = { ...board, gantt }
    setBoard(updated)
    saveBoard(updated)
  }, [board, saveBoard])

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

  const saveProjectName = () => {
    if (!board || !editNameVal.trim()) return
    const updated = { ...board, name: editNameVal.trim() }
    setBoard(updated)
    saveBoard(updated)
    setProjects(prev => prev.map(p => p.id === board.id ? { ...p, name: editNameVal.trim() } : p))
    setEditingProjectName(false)
  }

  const totalTasks = board?.tasks.length ?? 0
  const doneTasks = board?.tasks.filter(t => t.columnId === 'done').length ?? 0
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f2f2f7' }}>
      {/* Left Sidebar - Project Tabs */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r" style={{ background: 'rgba(255,255,255,0.82)', borderColor: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(20px)' }}>
        {/* Logo */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)' }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900 leading-none">Together</p>
              <p className="text-[10px] text-gray-400 mt-0.5">함께하는 프로젝트</p>
            </div>
          </div>
        </div>

        <div className="px-3 mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1">프로젝트</p>
        </div>

        {/* Project List */}
        <DndContext sensors={projectSensors} onDragEnd={handleProjectDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
              {projects.map(proj => (
                <SortableProjectItem
                  key={proj.id}
                  proj={proj}
                  isActive={proj.id === activeProjectId}
                  isAdmin={user.role === 'admin'}
                  onSelect={() => setActiveProjectId(proj.id)}
                  onDeleteClick={() => { setDeleteCode(''); setDeleteConfirm({ id: proj.id, name: proj.name }) }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* New Project Button (admin only) */}
        {user.role === 'admin' && (
          <div className="px-3 pt-3 pb-1">
            <button
              onClick={() => setShowNewProject(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 border border-dashed border-gray-200 hover:border-blue-300"
            >
              <Plus className="w-3.5 h-3.5" />
              새 프로젝트 추가
            </button>
          </div>
        )}

        {/* Feedback Button */}
        <div className="px-3 pb-1">
          <button
            onClick={() => setView(v => v === 'feedback' ? 'board' : 'feedback')}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200',
              view === 'feedback'
                ? 'text-purple-700 bg-purple-50'
                : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            이용자 피드백
          </button>
        </div>

        {/* User info + actions */}
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 mt-1">
          {/* User management — admin only */}
          {user.role === 'admin' && (
            <button
              onClick={() => setUserMgmtOpen(v => !v)}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 mb-1',
                userMgmtOpen ? 'text-indigo-700 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
              )}
            >
              <UserCog className="w-3.5 h-3.5" />
              사용자 관리
            </button>
          )}
          {/* Current user + logout */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: user.role === 'admin' ? 'linear-gradient(135deg, #007aff, #5856d6)' : 'linear-gradient(135deg, #34c759, #30d158)' }}>
              {user.name[0]}
            </div>
            <span className="text-[12px] font-semibold text-gray-700 flex-1 truncate">{user.name}</span>
            <button onClick={logout} className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0" title="로그아웃">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-5 border-b" style={{ background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(0,0,0,0.07)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-3">
            {board && (
              <>
                {editingProjectName ? (
                  <div className="flex items-center gap-2">
                    <input autoFocus value={editNameVal} onChange={e => setEditNameVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveProjectName(); if (e.key === 'Escape') setEditingProjectName(false) }}
                      className="text-base font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent outline-none px-1"
                    />
                    <button onClick={saveProjectName} className="p-1 rounded-lg bg-blue-500 text-white"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setEditingProjectName(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button className="flex items-center gap-1.5 group" onClick={() => { setEditNameVal(board.name); setEditingProjectName(true) }}>
                    <h2 className="text-base font-bold text-gray-900">{board.name}</h2>
                    <Edit2 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Progress (board only) */}
            {view === 'board' && totalTasks > 0 && (
              <div className="hidden md:flex items-center gap-3">
                <span className="text-xs text-gray-400">{doneTasks}/{totalTasks} 완료</span>
                <div className="w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #007aff, #5856d6)' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} />
                </div>
                <span className="text-xs font-semibold text-gray-600">{progress}%</span>
              </div>
            )}
            {/* 공지사항 */}
            <button
              onClick={() => setAnnouncementOpen(v => !v)}
              className={clsx('relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all', announcementOpen ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}
              style={announcementOpen ? { background: 'linear-gradient(135deg, #ff6b35, #ff9f0a)' } : {}}
            >
              <Megaphone className="w-4 h-4" />
              {unreadCount > 0 && !announcementOpen && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: '#ff3b30' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {/* 종합 캘린더 */}
            <button
              onClick={() => setView(v => v === 'global-calendar' ? 'board' : 'global-calendar')}
              className={clsx('flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all', view === 'global-calendar' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}
              style={view === 'global-calendar' ? { background: 'linear-gradient(135deg, #34c759, #30d158)' } : {}}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">종합 캘린더</span>
            </button>
            <button
              onClick={() => setAiOpen(v => !v)}
              className={clsx('flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all', aiOpen ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}
              style={aiOpen ? { background: 'linear-gradient(135deg, #007aff, #5856d6)' } : {}}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Agent</span>
            </button>
          </div>
        </header>

        {/* Per-project Tab Strip */}
        {board && !['global-calendar', 'feedback'].includes(view) && (
          <div className="flex-shrink-0 flex items-end px-5 border-b" style={{ background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(0,0,0,0.07)', height: 40 }}>
            <DndContext sensors={tabSensors} onDragEnd={handleTabDragEnd}>
              <SortableContext items={tabOrder} strategy={horizontalListSortingStrategy}>
                {orderedTabs.map(tab => (
                  <SortableTab
                    key={tab.key}
                    id={tab.key}
                    label={tab.label}
                    isActive={view === tab.key}
                    isAdmin={user.role === 'admin'}
                    onClick={() => setView(tab.key as TabKey)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {view === 'feedback' ? (
            <FeedbackBoard userName={user.name} isAdmin={user.role === 'admin'} />
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
          ) : (
            <>
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
              {/* AI Panel */}
              <AnimatePresence>
                {aiOpen && board && (
                  <AiPanel tasks={board.tasks} columns={board.columns} onClose={() => setAiOpen(false)} onInjectTasks={injectAiTasks} />
                )}
              </AnimatePresence>
            </>
          )}
          {/* Announcement Panel */}
          <AnimatePresence>
            {announcementOpen && (
              <AnnouncementPanel
                isAdmin={user.role === 'admin'}
                userName={user.name}
                onClose={() => setAnnouncementOpen(false)}
                onRead={markRead}
              />
            )}
          </AnimatePresence>
          {/* User Management Panel (admin) */}
          <AnimatePresence>
            {userMgmtOpen && user.role === 'admin' && (
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
              className="bg-white rounded-2xl w-full max-w-sm p-6"
              style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.18)' }}
            >
              {/* Warning icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto" style={{ background: 'rgba(255,59,48,0.1)' }}>
                <Trash2 className="w-5 h-5" style={{ color: '#ff3b30' }} />
              </div>

              <h3 className="text-base font-bold text-gray-900 text-center mb-1">프로젝트 삭제</h3>
              <p className="text-[12px] text-gray-400 text-center mb-1 leading-relaxed">
                <span className="font-semibold text-gray-700">"{deleteConfirm.name}"</span> 프로젝트와
              </p>
              <p className="text-[12px] text-gray-400 text-center mb-5 leading-relaxed">
                모든 태스크가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>

              <div className="mb-4">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
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
                  className="w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm text-center font-bold tracking-[0.4em] text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                  style={{
                    borderColor: deleteCode === '0000' ? '#ff3b30' : deleteCode.length > 0 ? '#ff9f0a' : '#e5e7eb',
                    boxShadow: deleteCode === '0000' ? '0 0 0 3px rgba(255,59,48,0.12)' : 'none',
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setDeleteConfirm(null); setDeleteCode('') }}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
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
              className="bg-white rounded-2xl w-full max-w-sm p-6" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
            >
              <h3 className="text-base font-bold text-gray-900 mb-4">새 프로젝트 만들기</h3>

              <div className="mb-5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">프로젝트 이름</label>
                <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()}
                  placeholder="예: 서울 역세권 복합개발"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewProject(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-100 transition-colors">취소</button>
                <button onClick={createProject} disabled={!newProjectName.trim()}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40"
                  style={{ background: newProjectName.trim() ? 'linear-gradient(135deg, #007aff, #5856d6)' : '#ccc' }}
                >시작하기</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
