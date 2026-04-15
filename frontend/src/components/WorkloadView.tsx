import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import type { ProjectBoard, ProjectMeta } from '../App'

type Props = {
  allBoards: Record<string, ProjectBoard>
  projects: ProjectMeta[]
  onSelectProject?: (projectId: string) => void
}

const STATUS_ORDER = ['To do', 'In Progress', 'In Review', 'Completed']
const STATUS_COLOR: Record<string, string> = {
  'To do':      '#6e6e73',
  'In Progress':'#6366f1',
  'In Review':  '#ff9f0a',
  'Completed':  '#34c759',
}

type PersonTask = {
  title: string
  projectName: string
  projectId: string
  status: string
  dueDate?: string | null
  priority?: string | null
}

type PersonData = {
  name: string
  tasks: PersonTask[]
  statusCounts: Record<string, number>
  activeTasks: number
}

function priorityColor(p?: string | null) {
  if (p === 'high') return '#ff3b30'
  if (p === 'medium') return '#ff9f0a'
  if (p === 'low') return '#34c759'
  return 'var(--t-border)'
}

function daysFromNow(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function WorkloadView({ allBoards, projects, onSelectProject }: Props) {
  const [filterProject, setFilterProject] = useState<string>('all')

  const people = useMemo((): PersonData[] => {
    const map: Record<string, PersonTask[]> = {}

    for (const board of Object.values(allBoards)) {
      if (filterProject !== 'all' && board.id !== filterProject) continue
      const proj = projects.find(p => p.id === board.id)
      if (!proj) continue

      for (const task of board.tasks ?? []) {
        const col = board.columns.find(c => c.id === task.columnId)
        const status = col?.title ?? task.columnId
        if (status === 'Archived') continue
        
        const assignees = task.assignee
          ? task.assignee.split(/[,]+/).map(s => s.trim().replace(/^\[|\]$/g, '').trim()).filter(Boolean)
          : ['미배정']

        for (const assignee of assignees) {
          if (!map[assignee]) map[assignee] = []
          map[assignee].push({
            title: task.title,
            projectName: proj.name,
            projectId: proj.id,
            status,
            dueDate: task.dueDate,
            priority: task.priority,
          })
        }
      }
    }

    return Object.entries(map)
      .map(([name, tasks]) => {
        const statusCounts: Record<string, number> = {}
        for (const t of tasks) {
          statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1
        }
        const activeTasks = tasks.filter(t => t.status === 'To do' || t.status === 'In Progress').length
        return { name, tasks, statusCounts, activeTasks }
      })
      .sort((a, b) => {
        if (a.name === '미배정') return 1
        if (b.name === '미배정') return -1
        return b.activeTasks - a.activeTasks
      })
  }, [allBoards, projects, filterProject])

  const workloadLevel = (active: number): { label: string; color: string; bg: string } => {
    if (active === 0) return { label: 'Idle', color: '#6e6e73', bg: 'rgba(110,110,115,0.1)' }
    if (active <= 3) return { label: 'Normal', color: '#34c759', bg: 'rgba(52,199,89,0.1)' }
    if (active <= 5) return { label: 'Busy', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)' }
    return { label: 'Overloaded', color: '#ff3b30', bg: 'rgba(255,59,48,0.1)' }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: 'var(--t-bg)' }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--t-border)', background: 'var(--t-surface)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
          <Users className="w-4 h-4" style={{ color: '#6366f1' }} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--t-text)' }}>팀 워크로드</h2>
          <p className="text-[11px]" style={{ color: 'var(--t-text3)' }}>담당자별 업무 현황</p>
        </div>
        <div className="flex-1" />

        {/* Project filter */}
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="text-[12px] px-3 py-1.5 rounded-xl outline-none"
          style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
        >
          <option value="all">전체 프로젝트</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Summary bar */}
      <div className="flex-shrink-0 flex items-center gap-6 px-6 py-3" style={{ borderBottom: '1px solid var(--t-border)', background: 'var(--t-surface)' }}>
        {(['To do', 'In Progress', 'In Review', 'Completed'] as const).map(s => {
          const total = people.reduce((acc, p) => acc + (p.statusCounts[s] ?? 0), 0)
          return (
            <div key={s} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--t-text)' }}>{total}</span>
              <span className="text-[11px]" style={{ color: 'var(--t-text3)' }}>{s}</span>
            </div>
          )
        })}
        <div className="flex-1" />
        <span className="text-[11px]" style={{ color: 'var(--t-text3)' }}>{people.filter(p => p.name !== '미배정').length}명</span>
      </div>

      {/* Person cards */}
      <div className="flex-1 overflow-y-auto p-6">
        {people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
              <Users className="w-6 h-6" style={{ color: '#6366f1' }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--t-text3)' }}>태스크에 담당자를 지정하면 워크로드가 표시됩니다</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {people.map(person => {
              const level = workloadLevel(person.activeTasks)
              const done = person.tasks.filter(t => t.status === 'Completed')

              return (
                <div
                  key={person.name}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                >
                  {/* Person header */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--t-border)' }}>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                      style={{ background: person.name === '미배정' ? 'var(--t-surface2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                      <span style={person.name === '미배정' ? { color: 'var(--t-text3)' } : {}}>
                        {person.name === '미배정' ? '?' : person.name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: 'var(--t-text)' }}>{person.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--t-text3)' }}>총 {person.tasks.length}개 · 완료 {done.length}개</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: level.bg, color: level.color }}>
                      {level.label}
                    </span>
                  </div>

                  {/* Status bar */}
                  <div className="flex h-1.5" style={{ background: 'var(--t-border)' }}>
                    {STATUS_ORDER.map(s => {
                      const count = person.statusCounts[s] ?? 0
                      if (count === 0) return null
                      const pct = (count / person.tasks.length) * 100
                      return <div key={s} style={{ width: `${pct}%`, background: STATUS_COLOR[s] }} />
                    })}
                  </div>

                  {/* Status counts */}
                  <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--t-border)' }}>
                    {STATUS_ORDER.filter(s => (person.statusCounts[s] ?? 0) > 0).map(s => (
                      <div key={s} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                        <span className="text-[11px] font-semibold" style={{ color: STATUS_COLOR[s] }}>{person.statusCounts[s]}</span>
                        <span className="text-[10px]" style={{ color: 'var(--t-text3)' }}>{s}</span>
                      </div>
                    ))}
                  </div>

                  {/* Task list */}
                  <div className="px-2 py-2 space-y-0.5 overflow-y-auto max-h-[240px]">
                    {person.tasks.map((task, i) => {
                      const days = task.dueDate ? daysFromNow(task.dueDate) : null
                      const urgent = days !== null && days <= 3
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-colors"
                          style={{ cursor: 'pointer' }}
                          onClick={() => onSelectProject?.(task.projectId)}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: priorityColor(task.priority) }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--t-text)' }}>{task.title}</p>
                            <p className="text-[10px] truncate" style={{ color: 'var(--t-text3)' }}>{task.projectName}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {task.dueDate && (
                              <span className="text-[10px] font-semibold" style={{ color: urgent ? '#ff3b30' : 'var(--t-text3)' }}>
                                {days === 0 ? '오늘' : days === 1 ? '내일' : days !== null && days < 0 ? `${Math.abs(days)}일 지남` : `D-${days}`}
                              </span>
                            )}
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: (STATUS_COLOR[task.status] ?? '#6e6e73') + '18', color: STATUS_COLOR[task.status] ?? '#6e6e73' }}
                            >
                              {task.status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
