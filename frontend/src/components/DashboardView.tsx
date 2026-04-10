import { useMemo } from 'react'
import { CalendarDays, Clock, MessageCircle, AlertCircle } from 'lucide-react'
import type { ProjectBoard, ProjectMeta } from '../App'

type Props = {
  allBoards: Record<string, ProjectBoard>
  projects: ProjectMeta[]
  onSelectProject?: (projectId: string) => void
}

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

export default function DashboardView({ allBoards, projects, onSelectProject }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const twoWeeksLater = new Date(today)
  twoWeeksLater.setDate(today.getDate() + 14)

  // 2주 내 일정
  const upcomingEvents = useMemo(() => {
    const events: { projectName: string; projectId: string; title: string; date: string; color: string; important?: boolean }[] = []
    for (const board of Object.values(allBoards)) {
      const proj = projects.find(p => p.id === board.id)
      if (!proj) continue
      for (const ev of board.events ?? []) {
        const d = new Date(ev.date)
        d.setHours(0, 0, 0, 0)
        if (d >= today && d <= twoWeeksLater) {
          events.push({ projectName: proj.name, projectId: proj.id, title: ev.title, date: ev.date, color: ev.color, important: ev.important })
        }
      }
    }
    return events.sort((a, b) => a.date.localeCompare(b.date))
  }, [allBoards, projects]) // eslint-disable-line

  // 마감 임박 태스크 (7일 이내)
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
        if (col?.title === '완료') continue
        tasks.push({
          projectName: proj.name,
          projectId: proj.id,
          title: task.title,
          dueDate: task.dueDate,
          assignee: task.assignee,
          columnTitle: col?.title ?? task.columnId,
        })
      }
    }
    return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [allBoards, projects]) // eslint-disable-line

  // 최근 채팅 (프로젝트별 최신 1개)
  const recentChats = useMemo(() => {
    return projects
      .map(proj => {
        const msgs = allBoards[proj.id]?.messages ?? []
        const last = msgs[msgs.length - 1]
        if (!last) return null
        return { projectName: proj.name, projectId: proj.id, author: last.author, content: last.content, createdAt: last.createdAt }
      })
      .filter(Boolean) as { projectName: string; projectId: string; author: string; content: string; createdAt: string }[]
  }, [allBoards, projects])

  const todayStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Date header */}
        <div>
          <p className="text-[11px] text-gray-400 font-medium">{todayStr}</p>
          <h1 className="text-[20px] font-bold text-gray-900 mt-0.5">대시보드</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 2주 내 주요 일정 */}
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: 'rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,122,255,0.1)' }}>
                <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <h3 className="text-[13px] font-bold text-gray-800">2주 내 주요 일정</h3>
              <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto">{upcomingEvents.length}</span>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="text-[12px] text-gray-300 py-4 text-center">예정된 일정이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 8).map((ev, i) => {
                  const { label, urgent } = formatRelativeDate(ev.date)
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onSelectProject?.(ev.projectId)}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-gray-800 truncate">{ev.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{ev.projectName}</p>
                      </div>
                      <span className={`text-[10px] font-semibold flex-shrink-0 ${urgent ? 'text-red-500' : 'text-gray-400'}`}>{label}</span>
                    </div>
                  )
                })}
                {upcomingEvents.length > 8 && (
                  <p className="text-[11px] text-gray-400 text-center pt-1">+{upcomingEvents.length - 8}개 더</p>
                )}
              </div>
            )}
          </div>

          {/* 마감 임박 태스크 */}
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: 'rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,59,48,0.1)' }}>
                <AlertCircle className="w-3.5 h-3.5" style={{ color: '#ff3b30' }} />
              </div>
              <h3 className="text-[13px] font-bold text-gray-800">마감 임박 태스크</h3>
              <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto">{urgentTasks.length}</span>
            </div>

            {urgentTasks.length === 0 ? (
              <p className="text-[12px] text-gray-300 py-4 text-center">마감 임박 태스크가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {urgentTasks.slice(0, 8).map((task, i) => {
                  const { label, urgent } = formatRelativeDate(task.dueDate)
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onSelectProject?.(task.projectId)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-gray-800 truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
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
                {urgentTasks.length > 8 && (
                  <p className="text-[11px] text-gray-400 text-center pt-1">+{urgentTasks.length - 8}개 더</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 최근 채팅 */}
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: 'rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(88,86,214,0.1)' }}>
              <MessageCircle className="w-3.5 h-3.5" style={{ color: '#5856d6' }} />
            </div>
            <h3 className="text-[13px] font-bold text-gray-800">최근 채팅</h3>
            <div className="flex items-center gap-1.5 ml-auto">
              <Clock className="w-3 h-3 text-gray-300" />
              <span className="text-[10px] text-gray-400">프로젝트별 최신 메시지</span>
            </div>
          </div>

          {recentChats.length === 0 ? (
            <p className="text-[12px] text-gray-300 py-4 text-center">최근 채팅이 없습니다</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {recentChats.map((chat, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => onSelectProject?.(chat.projectId)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-4 h-4 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}>
                      {chat.projectName[0]}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 truncate">{chat.projectName}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    <span className="font-medium text-gray-700">{chat.author}</span>: {chat.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
