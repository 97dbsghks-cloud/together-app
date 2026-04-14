import { useMemo } from 'react'
import { AlertCircle, CalendarDays, MessageSquare } from 'lucide-react'
import { Trash2 } from 'lucide-react'
import CalendarView from './CalendarView'
import GlobalChat from './GlobalChat'
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

const DONE_COLUMN_KEYWORDS = ['완료', '보관함']

function daysFromNow(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
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

export default function DashboardView({
  allBoards, projects, activeProjectId, isAdmin, userName,
  onSelectProject, onAddEvent, onDeleteEvent, onUpdateEvent,
}: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const twoWeeksLater = new Date(today)
  twoWeeksLater.setDate(today.getDate() + 14)

  const upcomingEvents = useMemo(() => {
    const events: { projectName: string; projectId: string; eventId: string; title: string; date: string; color: string }[] = []
    for (const board of Object.values(allBoards)) {
      const proj = projects.find(p => p.id === board.id)
      if (!proj) continue
      for (const ev of board.events ?? []) {
        const d = new Date(ev.date)
        d.setHours(0, 0, 0, 0)
        if (d >= today && d <= twoWeeksLater) {
          events.push({ projectName: proj.name, projectId: proj.id, eventId: ev.id, title: ev.title, date: ev.date, color: ev.color })
        }
      }
    }
    return events.sort((a, b) => a.date.localeCompare(b.date))
  }, [allBoards, projects]) // eslint-disable-line

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
        tasks.push({ projectName: proj.name, projectId: proj.id, title: task.title, dueDate: task.dueDate, assignee: task.assignee, columnTitle: colTitle || task.columnId })
      }
    }
    return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [allBoards, projects]) // eslint-disable-line

  const cardStyle = {
    background: 'var(--t-surface)',
    borderRadius: 20,
    border: '1px solid var(--t-border)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    overflow: 'hidden' as const,
  }

  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-4" style={{ background: 'var(--t-bg)' }}>

      {/* Left — Calendar + Global Chat stacked */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-4">
        {/* Calendar card */}
        <div className="flex-1 flex flex-col min-h-0" style={cardStyle}>
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

        {/* Global Chat card */}
        <div className="flex-shrink-0 flex flex-col" style={{ ...cardStyle, height: 260 }}>
          <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--t-border)' }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <MessageSquare className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
            </div>
            <h3 className="text-[13px] font-bold t-text flex-1">전체 채팅</h3>
            <span className="text-[10px]" style={{ color: 'var(--t-text3)' }}>모든 팀원 참여</span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <GlobalChat userName={userName} isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      {/* Right — two stacked cards */}
      <div className="flex flex-col gap-4 w-72 flex-shrink-0 min-h-0">

        {/* 2주 내 주요 일정 */}
        <div className="flex flex-col min-h-0 flex-1" style={cardStyle}>
          <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--t-border)' }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <h3 className="text-[13px] font-bold t-text flex-1">2주 내 주요 일정</h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)' }}>
              {upcomingEvents.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-6">
                <p className="text-[12px] t-text3">예정된 일정이 없습니다</p>
              </div>
            ) : upcomingEvents.map((ev, i) => {
              const { label, urgent } = formatRelativeDate(ev.date)
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl t-hover group transition-colors cursor-pointer"
                  onClick={() => onSelectProject?.(ev.projectId)}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold t-text truncate">{ev.title}</p>
                    <p className="text-[10px] t-text3 truncate">{ev.projectName}</p>
                  </div>
                  <span className={`text-[10px] font-bold flex-shrink-0 ${urgent ? 'text-red-500' : 't-text3'}`}>{label}</span>
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteEvent(ev.projectId, ev.eventId) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all flex-shrink-0"
                      style={{ color: '#ef4444' }}
                    >
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
          <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--t-border)' }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertCircle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
            </div>
            <h3 className="text-[13px] font-bold t-text flex-1">마감 임박 태스크</h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)' }}>
              {urgentTasks.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {urgentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-6">
                <p className="text-[12px] t-text3">마감 임박 태스크가 없습니다</p>
              </div>
            ) : urgentTasks.map((task, i) => {
              const { label, urgent } = formatRelativeDate(task.dueDate)
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl t-hover cursor-pointer transition-colors"
                  onClick={() => onSelectProject?.(task.projectId)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold t-text truncate">{task.title}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <p className="text-[10px] t-text3 truncate">{task.projectName}</p>
                      <span className="text-[10px] t-text3">·</span>
                      <p className="text-[10px] t-text3">{task.columnTitle}</p>
                      {task.assignee && (
                        <>
                          <span className="text-[10px] t-text3">·</span>
                          <p className="text-[10px] t-text3">{task.assignee}</p>
                        </>
                      )}
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
