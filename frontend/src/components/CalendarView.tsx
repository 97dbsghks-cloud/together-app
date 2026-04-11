import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react'
import type { CalendarEvent, ProjectBoard, ProjectMeta } from '../App'
import AddEventModal from './AddEventModal'

type EventWithMeta = {
  event: CalendarEvent
  projectId: string
  projectName: string
}

type Props = {
  allBoards: Record<string, ProjectBoard>
  projects: ProjectMeta[]
  activeProjectId: string | null
  filterProjectId?: string
  hideEventList?: boolean
  onAddEvent: (projectId: string, event: CalendarEvent) => void
  onDeleteEvent: (projectId: string, eventId: string) => void
  onUpdateEvent: (projectId: string, event: CalendarEvent) => void
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
const LANE_H = 22      // px per multi-day event lane
const DAY_NUM_H = 28   // px reserved for day-number row

/** Mon=0 … Sun=6 */
function dateToCol(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  return (d.getDay() + 6) % 7
}

function EventRow({
  event, todayStr, onEdit, onDelete,
}: {
  event: CalendarEvent
  projectId: string
  todayStr: string
  onEdit: () => void
  onDelete: () => void
}) {
  const isPast = event.endDate ? event.endDate < todayStr : event.date < todayStr
  const dateLabel = event.endDate ? `${event.date} ~ ${event.endDate}` : event.date

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-100 group transition-opacity ${isPast ? 'opacity-50' : ''}`}>
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{event.title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{dateLabel}</p>
        {event.description && (
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{event.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function CalendarView({
  allBoards, projects, activeProjectId, filterProjectId, hideEventList,
  onAddEvent, onDeleteEvent, onUpdateEvent,
}: Props) {
  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [addingDate, setAddingDate] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<EventWithMeta | null>(null)
  const [editingEntry, setEditingEntry] = useState<EventWithMeta | null>(null)
  const [dropOver, setDropOver] = useState(false)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const dragRef = useRef<{ projectId: string; event: EventWithMeta['event'] } | null>(null)

  function shiftDate(dateStr: string, deltaMs: number): string {
    const d = new Date(dateStr + 'T00:00:00')
    const s = new Date(d.getTime() + deltaMs)
    return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`
  }

  const year = current.getFullYear()
  const month = current.getMonth()
  const mm = String(month + 1).padStart(2, '0')
  const cellDate = (d: number) => `${year}-${mm}-${String(d).padStart(2, '0')}`

  // Build flat cell array (null = empty/prev-month padding)
  const firstDow = new Date(year, month, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Group into week rows
  const weeks: (number | null)[][] = Array.from(
    { length: cells.length / 7 },
    (_, i) => cells.slice(i * 7, i * 7 + 7),
  )

  // Flatten all events from all boards in allBoards
  const allEvents: EventWithMeta[] = Object.values(allBoards).flatMap(board => {
    const meta = projects.find(p => p.id === board.id)
    return (board.events ?? []).map(ev => ({
      event: ev,
      projectId: board.id,
      projectName: meta?.name ?? board.name,
    }))
  })

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="flex-1 overflow-y-auto p-5 min-h-0">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <h2 className="text-base font-bold text-gray-900 w-24 text-center">
            {year}년 {month + 1}월
          </h2>
          <button
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <button
          onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="text-xs font-semibold text-blue-500 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          오늘
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-semibold py-1.5 ${
              i === 5 ? 'text-blue-400' : i === 6 ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — week by week */}
      <div className="border-t border-l border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {weeks.map((week, wIdx) => {
          const weekDates = week.map(d => (d ? cellDate(d) : null))
          const validDates = weekDates.filter(Boolean) as string[]
          const weekStart = validDates[0]
          const weekEnd = validDates[validDates.length - 1]

          // --- Build multi-day event bars ---
          type Bar = EventWithMeta & {
            startCol: number
            span: number
            startsHere: boolean
            endsHere: boolean
            lane: number
          }

          const bars: Bar[] = []
          allEvents
            .filter(
              ({ event }) =>
                event.endDate &&
                event.endDate !== event.date &&
                event.date <= weekEnd &&
                event.endDate >= weekStart,
            )
            .forEach(({ event, projectId, projectName }) => {
              const clampedStart = event.date < weekStart ? weekStart : event.date
              const clampedEnd = event.endDate! > weekEnd ? weekEnd : event.endDate!
              const startCol = dateToCol(clampedStart)
              const endCol = dateToCol(clampedEnd)
              bars.push({
                event,
                projectId,
                projectName,
                startCol,
                span: endCol - startCol + 1,
                startsHere: event.date >= weekStart,
                endsHere: event.endDate! <= weekEnd,
                lane: 0,
              })
            })

          // Greedy lane assignment
          const occupied: boolean[][] = []
          bars.forEach(bar => {
            let lane = 0
            while (true) {
              if (!occupied[lane]) occupied[lane] = new Array(7).fill(false)
              const blocked = Array.from({ length: bar.span }, (_, i) => bar.startCol + i).some(
                c => occupied[lane][c],
              )
              if (!blocked) {
                for (let c = bar.startCol; c < bar.startCol + bar.span; c++) occupied[lane][c] = true
                bar.lane = lane
                break
              }
              lane++
            }
          })

          const numLanes = occupied.length
          const cellMinH = Math.max(96, DAY_NUM_H + numLanes * LANE_H + 44)

          return (
            <div key={wIdx} className="relative grid grid-cols-7">
              {/* Day cells */}
              {week.map((day, col) => {
                const dateStr = weekDates[col]
                const isToday = dateStr === todayStr
                const dow = col

                // Only single-day events inside the cell
                const sdEvents = dateStr
                  ? allEvents.filter(
                      ({ event }) =>
                        event.date === dateStr &&
                        (!event.endDate || event.endDate === event.date),
                    )
                  : []

                return (
                  <div
                    key={day ?? `e-${wIdx}-${col}`}
                    onClick={() => day && dateStr && setAddingDate(dateStr)}
                    onDragOver={e => {
                      if (!dragRef.current || !dateStr) return
                      e.preventDefault()
                      setDragOverDate(dateStr)
                    }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverDate(null)
                      }
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      setDragOverDate(null)
                      const d = dragRef.current
                      if (!d || !dateStr || d.event.date === dateStr) return
                      dragRef.current = null
                      const deltaMs =
                        new Date(dateStr + 'T00:00:00').getTime() -
                        new Date(d.event.date + 'T00:00:00').getTime()
                      onUpdateEvent(d.projectId, {
                        ...d.event,
                        date: dateStr,
                        ...(d.event.endDate ? { endDate: shiftDate(d.event.endDate, deltaMs) } : {}),
                      })
                    }}
                    className={`border-r border-b border-gray-100 transition-colors ${
                      day
                        ? dragOverDate === dateStr
                          ? 'bg-blue-100'
                          : 'bg-white cursor-pointer hover:bg-blue-50/20'
                        : 'bg-gray-50/60'
                    }`}
                    style={{ minHeight: cellMinH }}
                  >
                    {day && (
                      <>
                        {/* Day number */}
                        <div className="p-1.5" style={{ height: DAY_NUM_H }}>
                          <span
                            className={`text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                              isToday
                                ? 'bg-blue-500 text-white'
                                : dow === 5
                                ? 'text-blue-500'
                                : dow === 6
                                ? 'text-red-500'
                                : 'text-gray-700'
                            }`}
                          >
                            {day}
                          </span>
                        </div>

                        {/* Spacer for spanning bars */}
                        <div style={{ height: numLanes * LANE_H }} />

                        {/* Single-day events */}
                        <div className="px-1.5 pb-1.5 space-y-0.5">
                          {sdEvents.slice(0, 3).map(({ event, projectId: pid, projectName }) => (
                            <div
                              key={event.id}
                              draggable={true}
                              onDragStart={e => {
                                e.stopPropagation()
                                dragRef.current = { projectId: pid, event }
                                e.dataTransfer.effectAllowed = 'move'
                              }}
                              onClick={e => {
                                e.stopPropagation()
                                setSelectedEntry({ event, projectId: pid, projectName })
                              }}
                              className="w-full text-left px-1.5 py-[2px] rounded text-[10px] font-medium text-white truncate hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing"
                              style={{ backgroundColor: event.color }}
                            >
                              {event.title}
                            </div>
                          ))}
                          {sdEvents.length > 3 && (
                            <p className="text-[9px] text-gray-400 pl-1">
                              +{sdEvents.length - 3}개 더
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Multi-day spanning bars — absolutely positioned over the day cells */}
              {bars.map(bar => {
                const leftPct = (bar.startCol / 7) * 100
                const widthPct = (bar.span / 7) * 100
                const topPx = DAY_NUM_H + bar.lane * LANE_H + 2

                return (
                  <button
                    key={bar.event.id}
                    draggable={!bar.event.important}
                    onDragStart={e => {
                      e.stopPropagation()
                      dragRef.current = { projectId: bar.projectId, event: bar.event }
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={e => {
                      e.stopPropagation()
                      setSelectedEntry({
                        event: bar.event,
                        projectId: bar.projectId,
                        projectName: bar.projectName,
                      })
                    }}
                    className="absolute flex items-center text-[10px] font-medium text-white px-2 truncate hover:brightness-90 transition-all z-10"
                    style={{
                      top: topPx,
                      left: `calc(${leftPct}% + ${bar.startsHere ? 3 : 0}px)`,
                      width: `calc(${widthPct}% - ${bar.startsHere ? 3 : 0}px - ${bar.endsHere ? 3 : 0}px)`,
                      height: LANE_H - 4,
                      backgroundColor: bar.event.color,
                      borderRadius: `${bar.startsHere ? 5 : 0}px ${bar.endsHere ? 5 : 0}px ${bar.endsHere ? 5 : 0}px ${bar.startsHere ? 5 : 0}px`,
                    }}
                  >
                    {bar.startsHere ? bar.event.title : ''}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Milestone / Schedule list */}
      {(() => {
        const visibleEvents = allEvents
          .filter(e => (!filterProjectId || e.projectId === filterProjectId) && e.event.important)
          .sort((a, b) => a.event.date.localeCompare(b.event.date))

        const isGlobal = !filterProjectId
        const grouped: Record<string, typeof visibleEvents> = {}
        if (isGlobal) {
          visibleEvents.forEach(e => {
            if (!grouped[e.projectId]) grouped[e.projectId] = []
            grouped[e.projectId].push(e)
          })
        }

        if (hideEventList) return null

        return (
          <div
            className="mt-5"
            onDragOver={e => { e.preventDefault(); setDropOver(true) }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDropOver(false)
              }
            }}
            onDrop={e => {
              e.preventDefault()
              setDropOver(false)
              const d = dragRef.current
              if (!d || d.event.important) return
              onUpdateEvent(d.projectId, { ...d.event, important: true })
              dragRef.current = null
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">주요 일정</h3>
              {filterProjectId && (
                <button
                  onClick={() => setAddingDate(todayStr)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  일정 추가
                </button>
              )}
            </div>

            {visibleEvents.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed transition-colors ${dropOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                <p className="text-[12px] text-gray-400 font-medium">등록된 주요 일정이 없습니다</p>
                <p className="text-[11px] text-gray-300 mt-0.5">달력의 일정을 여기로 드래그하면 주요 일정으로 등록됩니다</p>
              </div>
            ) : isGlobal ? (
              <div className={`space-y-4 rounded-2xl border-2 border-dashed transition-colors p-2 ${dropOver ? 'border-blue-400 bg-blue-50/30' : 'border-transparent'}`}>
                {Object.entries(grouped).map(([projId, entries]) => {
                  const projName = projects.find(p => p.id === projId)?.name ?? projId
                  return (
                    <div key={projId}>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                        {projName}
                      </p>
                      <div className="space-y-1.5">
                        {entries.map(({ event, projectId }) => (
                          <EventRow
                            key={event.id}
                            event={event}
                            projectId={projectId}
                            todayStr={todayStr}
                            onEdit={() => setEditingEntry({ event, projectId, projectName: projName })}
                            onDelete={() => onUpdateEvent(projectId, { ...event, important: false })}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={`space-y-1.5 rounded-2xl border-2 border-dashed transition-colors p-2 ${dropOver ? 'border-blue-400 bg-blue-50/30' : 'border-transparent'}`}>
                {visibleEvents.map(({ event, projectId, projectName }) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    projectId={projectId}
                    todayStr={todayStr}
                    onEdit={() => setEditingEntry({ event, projectId, projectName })}
                    onDelete={() => onUpdateEvent(projectId, { ...event, important: false })}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Add Event Modal */}
      <AnimatePresence>
        {addingDate && (
          <AddEventModal
            date={addingDate}
            projects={projects}
            activeProjectId={activeProjectId}
            lockedProjectId={filterProjectId}
            onClose={() => setAddingDate(null)}
            onAdd={(projectId, event) => {
              onAddEvent(projectId, event)
              setAddingDate(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEntry && !editingEntry && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(6px)' }}
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-xs p-5"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedEntry.event.color }} />
                <h3 className="text-sm font-bold text-gray-900 flex-1">{selectedEntry.event.title}</h3>
                {selectedEntry.event.important && <span className="text-sm">⭐</span>}
              </div>
              <p className="text-[11px] text-gray-400 mb-1">
                📅 {selectedEntry.event.date}
                {selectedEntry.event.endDate && ` ~ ${selectedEntry.event.endDate}`}
              </p>
              <p className="text-[11px] text-gray-400 mb-3">📁 {selectedEntry.projectName}</p>
              {selectedEntry.event.description && (
                <p className="text-[12px] text-gray-600 bg-gray-50 rounded-xl px-3 py-2 mb-3 leading-relaxed">
                  {selectedEntry.event.description}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingEntry(selectedEntry); setSelectedEntry(null) }}
                  className="flex-1 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => {
                    onDeleteEvent(selectedEntry.projectId, selectedEntry.event.id)
                    setSelectedEntry(null)
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Event Modal */}
      <AnimatePresence>
        {editingEntry && (
          <AddEventModal
            date={editingEntry.event.date}
            projects={projects}
            activeProjectId={editingEntry.projectId}
            editingEvent={editingEntry.event}
            editingProjectId={editingEntry.projectId}
            lockedProjectId={filterProjectId}
            onClose={() => setEditingEntry(null)}
            onAdd={(projectId, event) => {
              onUpdateEvent(projectId, event)
              setEditingEntry(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
