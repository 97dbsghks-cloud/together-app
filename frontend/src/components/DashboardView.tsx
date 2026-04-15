import { useMemo } from 'react'
import { AlertCircle, CalendarDays, TrendingUp, Activity, CheckCircle2, Trash2 } from 'lucide-react'
import CalendarView from './CalendarView'
import type { ProjectBoard, ProjectMeta, CalendarEvent } from '../App'

type Props = {
  allBoards: Record<string, ProjectBoard>
  projects: ProjectMeta[]
  activeProjectId: string | null
  isAdmin: boolean
  userName: string
  onSelectProject?: (projectId: string) => void
  onAddEvent: (projectId: string, event: CalendarEvent) => void
  onDeleteEvent: (projectId: string, eventId: string) => void
  onUpdateEvent: (projectId: string, event: CalendarEvent) => void
}

const DONE_COLUMN_KEYWORDS = ['Completed', 'Archived']
const COMPLETED_KEYWORD = 'Completed'

function daysFromNow(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatRelativeDate(dateStr: string): { label: string; urgent: boolean } {
  const days = daysFromNow(dateStr)
  if (days < 0) return { label: `${Math.abs(days)}일 지남`, urgent: true }
  if (days === 0) return { label: '오늘', urgent: true }
  if (days === 1) return { label: '내일', urgent: true }
  if (days <= 3) return { label: `${days}일 후`, urgent: true }
  return { label: `${days}일 후`, urgent: false }
}

const cardStyle = {
  background: 'var(--t-surface)',
  borderRadius: 20,
  border: '1px solid var(--t-border)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  overflow: 'hidden' as const,
}

function CardHeader({ icon, label, count, iconBg, iconColor }: {
  icon: React.ReactNode; label: string; count?: number; iconBg: string; iconColor: string
}) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--t-border)' }}>
      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <h3 className="text-[13px] font-bold t-text flex-1">{label}</h3>
      {count !== undefined && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)' }}>
          {count}
        </span>
      )}
    </div>
  )
}

export default function DashboardView({
  allBoards, projects, activeProjectId, isAdmin,
  onSelectProject, onAddEvent, onDeleteEvent, onUpdateEvent,
}: Props) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const twoWeeksLater = new Date(today); twoWeeksLater.setDate(today.getDate() + 14)

  // 프로젝트 진행률
  const projectProgress = useMemo(() => projects.map(proj => {
    const board = allBoards[proj.id]
    if (!board) return { proj, total: 0, completed: 0, inProgress: 0 }
    const tasks = board.tasks ?? []
    const total = tasks.length
    const completed = tasks.filter(t => {
      const col = board.columns.find(c => c.id === t.columnId)
      return col && DONE_COLUMN_KEYWORDS.some(kw => col.title.includes(kw))
    }).length
    const inProgress = tasks.filter(t => {
      const col = board.columns.find(c => c.id === t.columnId)
      return col && col.title === 'In Progress'
    }).length
    return { proj, total, completed, inProgress }
  }).filter(p => p.total > 0), [allBoards, projects])

  // 주간 완료 현황 (Completed 컬럼 태스크 수)
  const completedCount = useMemo(() => {
    let count = 0
    for (const board of Object.values(allBoards)) {
      for (const task of board.tasks ?? []) {
        const col = board.columns.find(c => c.id === task.columnId)
        if (col && col.title === COMPLETED_KEYWORD) count++
      }
    }
    return count
  }, [allBoards])

  // 팀 활동 피드 (In Progress + 최근 Completed 태스크)
  const activityFeed = useMemo(() => {
    const items: { projectName: string; projectId: string; title: string; assignee?: string; status: 'active' | 'done' }[] = []
    for (const board of Object.values(allBoards)) {
      const proj = projects.find(p => p.id === board.id)
      if (!proj) continue
      for (const task of board.tasks ?? []) {
        const col = board.columns.find(c => c.id === task.columnId)
        if (!col) continue
        if (col.title === 'In Progress') {
          items.push({ projectName: proj.name, projectId: proj.id, title: task.title, assignee: task.assignee ?? undefined, status: 'active' })
        } else if (col.title === COMPLETED_KEYWORD) {
          items.push({ projectName: proj.name, projectId: proj.id, title: task.title, assignee: task.assignee ?? undefined, status: 'done' })
        }
      }
    }
    return items.slice(0, 20)
  }, [allBoards, projects])

  // 2주 내 일정
  const upcomingEvents = useMemo(() => {
    const events: { projectName: string; projectId: string; eventId: string; title: string; date: string; color: string }[] = []
    for (const board of Object.values(allBoards)) {
      const proj = projects.find(p => p.id === board.id)
      if (!proj) continue
      for (const ev of board.events ?? []) {
        const d = new Date(ev.date); d.setHours(0, 0, 0, 0)
        if (d >= today && d <= twoWeeksLater) {
          events.push({ projectName: proj.name, projectId: proj.id, eventId: ev.id, title: ev.title, date: ev.date, color: ev.color })
        }
      }
    }
    return events.sort((a, b) => a.date.localeCompare(b.date))
  }, [allBoards, projects]) // eslint-disable-line

  // 마감 임박 태스크
  const urgentTasks = useMemo(() => {
    const tasks: { projectName: string; projectId: string; title: string; dueDate: string; assignee?: string; columnTitle: string }[] = []
    for (const board of Object.values(allBoards)) {
      const proj = projects.find(p => p.id === board.id)
      if (!proj) continue
      for (const task of board.tasks ?? []) {
        if (!task.dueDate) continue
        const days = daysFromNow(task.dueDate)
        if (days > 7) continue
        const col = board.columns.find(c => c.id === task.columnId)
        const colTitle = col?.title ?? ''
        if (DONE_COLUMN_KEYWORDS.some(kw => colTitle.includes(kw))) continue
        tasks.push({ projectName: proj.name, projectId: proj.id, title: task.title, dueDate: task.dueDate, assignee: task.assignee ?? undefined, columnTitle: colTitle })
      }
    }
    return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [allBoards, projects]) // eslint-disable-line

  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-3" style={{ background: 'var(--t-bg)' }}>

      {/* Left — Calendar (full height) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0" style={cardStyle}>
        <CalendarView
          allBoards={allBoards}
          projects={projects}
          activeProjectId={activeProjectId}
          hideEventList
          onAddEvent={onAddEvent}
          onDeleteEvent={onDeleteEvent}
          onUpdateEvent={onUpdateEvent}
        />
      </div>

      {/* Center — 주간 완료 + 프로젝트 진행률 + 팀 활동 피드 */}
      <div className="flex flex-col gap-3 flex-shrink-0 min-h-0" style={{ width: 260 }}>

        {/* 주간 완료 현황 */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,199,89,0.12)' }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: '#34c759' }} />
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: 'var(--t-text3)' }}>완료된 태스크</p>
            <p className="text-[22px] font-bold leading-tight" style={{ color: 'var(--t-text)' }}>{completedCount}</p>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-[11px] font-medium" style={{ color: 'var(--t-text3)' }}>진행 중</p>
            <p className="text-[22px] font-bold leading-tight" style={{ color: '#6366f1' }}>
              {activityFeed.filter(a => a.status === 'active').length}
            </p>
          </div>
        </div>

        {/* 프로젝트 진행률 */}
        <div className="flex flex-col min-h-0 flex-1" style={cardStyle}>
          <CardHeader icon={<TrendingUp className="w-3.5 h-3.5" />} label="프로젝트 진행률" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1" />
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {projectProgress.length === 0 ? (
              <div className="flex items-center justify-center h-full py-6">
                <p className="text-[12px] t-text3">프로젝트가 없습니다</p>
              </div>
            ) : projectProgress.map(({ proj, total, completed, inProgress }) => {
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0
              return (
                <div key={proj.id} className="px-2 py-1.5 rounded-xl cursor-pointer transition-colors t-hover" onClick={() => onSelectProject?.(proj.id)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px]">{proj.emoji}</span>
                      <p className="text-[12px] font-semibold t-text truncate">{proj.name}</p>
                    </div>
                    <span className="text-[11px] font-bold flex-shrink-0 ml-2" style={{ color: pct === 100 ? '#34c759' : 'var(--t-text3)' }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: pct === 100 ? '#34c759' : 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--t-text3)' }}>{completed}/{total} 완료</span>
                    {inProgress > 0 && <span className="text-[10px]" style={{ color: '#6366f1' }}>· {inProgress}개 진행 중</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 팀 활동 피드 */}
        <div className="flex flex-col min-h-0 flex-1" style={cardStyle}>
          <CardHeader icon={<Activity className="w-3.5 h-3.5" />} label="팀 활동" count={activityFeed.length} iconBg="rgba(255,159,10,0.1)" iconColor="#ff9f0a" />
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {activityFeed.length === 0 ? (
              <div className="flex items-center justify-center h-full py-6">
                <p className="text-[12px] t-text3">활동 내역이 없습니다</p>
              </div>
            ) : activityFeed.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-xl t-hover cursor-pointer transition-colors" onClick={() => onSelectProject?.(item.projectId)}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.status === 'done' ? '#34c759' : '#6366f1' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium t-text truncate">{item.title}</p>
                  <p className="text-[10px] t-text3 truncate">{item.projectName}{item.assignee ? ` · ${item.assignee}` : ''}</p>
                </div>
                <span className="text-[10px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-full" style={item.status === 'done'
                  ? { background: 'rgba(52,199,89,0.12)', color: '#34c759' }
                  : { background: 'rgba(99,102,241,0.1)', color: '#6366f1' }
                }>
                  {item.status === 'done' ? 'Done' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — 2주 일정 + 마감 태스크 */}
      <div className="flex flex-col gap-3 flex-shrink-0 min-h-0" style={{ width: 252 }}>

        {/* 2주 내 주요 일정 */}
        <div className="flex flex-col min-h-0 flex-1" style={cardStyle}>
          <CardHeader icon={<CalendarDays className="w-3.5 h-3.5" />} label="2주 내 주요 일정" count={upcomingEvents.length} iconBg="rgba(59,130,246,0.1)" iconColor="#3b82f6" />
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {upcomingEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full py-6">
                <p className="text-[12px] t-text3">예정된 일정이 없습니다</p>
              </div>
            ) : upcomingEvents.map((ev, i) => {
              const { label, urgent } = formatRelativeDate(ev.date)
              return (
                <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-xl t-hover group transition-colors cursor-pointer" onClick={() => onSelectProject?.(ev.projectId)}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold t-text truncate">{ev.title}</p>
                    <p className="text-[10px] t-text3 truncate">{ev.projectName}</p>
                  </div>
                  <span className={`text-[10px] font-bold flex-shrink-0 ${urgent ? 'text-red-500' : 't-text3'}`}>{label}</span>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); onDeleteEvent(ev.projectId, ev.eventId) }} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all flex-shrink-0" style={{ color: '#ef4444' }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 마감 임박 태스크 */}
        <div className="flex flex-col min-h-0 flex-1" style={cardStyle}>
          <CardHeader icon={<AlertCircle className="w-3.5 h-3.5" />} label="마감 임박 태스크" count={urgentTasks.length} iconBg="rgba(239,68,68,0.1)" iconColor="#ef4444" />
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {urgentTasks.length === 0 ? (
              <div className="flex items-center justify-center h-full py-6">
                <p className="text-[12px] t-text3">마감 임박 태스크가 없습니다</p>
              </div>
            ) : urgentTasks.map((task, i) => {
              const { label, urgent } = formatRelativeDate(task.dueDate)
              return (
                <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-xl t-hover cursor-pointer transition-colors" onClick={() => onSelectProject?.(task.projectId)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold t-text truncate">{task.title}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <p className="text-[10px] t-text3 truncate">{task.projectName}</p>
                      {task.assignee && <><span className="text-[10px] t-text3">·</span><p className="text-[10px] t-text3">{task.assignee}</p></>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold flex-shrink-0 ${urgent ? 'text-red-500' : 't-text3'}`}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
