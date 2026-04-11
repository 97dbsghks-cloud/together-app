import { useMemo } from 'react'
import { AlertCircle, CalendarDays, Trash2 } from 'lucide-react'
import CalendarView from './CalendarView'
import type { ProjectBoard, ProjectMeta, CalendarEvent } from '../App'

type Props = {
  allBoards: Record<string, ProjectBoard>
  projects: ProjectMeta[]
  activeProjectId: string | null
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
  allBoards, projects, activeProjectId,
  onSelectProject, onAddEvent, onDeleteEvent, onUpdateEvent,
}: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const twoWeeksLater = new Date(today)
  twoWeeksLater.setDate(today.getDate() + 14)

  // 2주 내 일정
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

  // 마감 임박 태스크 (7일 이내, 완료/보관함 제외)
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
        tasks.push({
          projectName: proj.name,
          projectId: proj.id,
          title: task.title,
          dueDate: task.dueDate,
          assignee: task.assignee,
          columnTitle: colTitle || task.columnId,
        })
      }
    }
    return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [allBoards, projects]) // eslint-disable-line

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 종합 캘린더 */}
      <div className="flex-1 overflow-hidden">
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

      {/* 하단 정보 패널 */}
      <div
        className="grid grid-cols-2 gap-0 border-t"
        style={{ borderColor: 'rgba(0,0,0,0.07)', height: 200, minHeight: 0 }}
      >
        {/* 2주 내 주요 일정 */}
        <div className="flex flex-col min-h-0 border-r" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
          <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
            <h3 className="text-[12px] font-bold text-gray-700">2주 내 주요 일정</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto">{upcomingEvents.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-3">
          {upcomingEvents.length === 0 ? (
            <p className="text-[11px] text-gray-300 py-3 text-center">예정된 일정이 없습니다</p>
          ) : (
            <div className="space-y-1">
              {upcomingEvents.map((ev, i) => {
                const { label, urgent } = formatRelativeDate(ev.date)
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 group transition-colors cursor-pointer"
                    onClick={() => onSelectProject?.(ev.projectId)}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-gray-800 truncate">{ev.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{ev.projectName}</p>
                    </div>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${urgent ? 'text-red-500' : 'text-gray-400'}`}>{label}</span>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteEvent(ev.projectId, ev.eventId) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </div>

        {/* 마감 임박 태스크 */}
        <div className="flex flex-col min-h-0">
          <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
            <AlertCircle className="w-3.5 h-3.5" style={{ color: '#ff3b30' }} />
            <h3 className="text-[12px] font-bold text-gray-700">마감 임박 태스크</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto">{urgentTasks.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-3">
          {urgentTasks.length === 0 ? (
            <p className="text-[11px] text-gray-300 py-3 text-center">마감 임박 태스크가 없습니다</p>
          ) : (
            <div className="space-y-1">
              {urgentTasks.map((task, i) => {
                const { label, urgent } = formatRelativeDate(task.dueDate)
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onSelectProject?.(task.projectId)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-gray-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[10px] text-gray-400 truncate">{task.projectName}</p>
                        <span className="text-[10px] text-gray-300">·</span>
                        <p className="text-[10px] text-gray-400">{task.columnTitle}</p>
                        {task.assignee && (
                          <>
                            <span className="text-[10px] text-gray-300">·</span>
                            <p className="text-[10px] text-gray-400">{task.assignee}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${urgent ? 'text-red-500' : 'text-gray-400'}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
