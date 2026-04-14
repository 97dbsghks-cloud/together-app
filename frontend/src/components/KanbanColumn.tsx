import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X, ArrowUpDown, ArrowUp, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import SortableTaskCard from './SortableTaskCard'
import type { Task, Column, TaskPriority } from '../App'

const PRIORITY_ORDER: Record<TaskPriority | 'none', number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
}

type SortMode = 'default' | 'priority_asc' | 'priority_desc'

type Props = {
  col: Column
  tasks: Task[]
  allColumns: Column[]
  isOver: boolean
  onDeleteColumn: (id: string) => void
  onUpdateColumnTitle: (id: string, title: string) => void
  onAddTask: () => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (task: Task) => void
  onClickTask: (task: Task) => void
}

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  if (mode === 'default') return tasks
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority ?? 'none']
    const pb = PRIORITY_ORDER[b.priority ?? 'none']
    return mode === 'priority_asc' ? pa - pb : pb - pa
  })
}

export default function KanbanColumn({
  col, tasks, allColumns, isOver,
  onDeleteColumn, onUpdateColumnTitle, onAddTask,
  onDeleteTask, onUpdateTask, onClickTask,
}: Props) {
  const { setNodeRef } = useDroppable({ id: col.id })
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const isArchive = col.title.trim() === '보관함'
  const [collapsed, setCollapsed] = useState(false)

  const cycleSortMode = () => {
    setSortMode(prev =>
      prev === 'default' ? 'priority_asc'
        : prev === 'priority_asc' ? 'priority_desc'
          : 'default'
    )
  }

  const displayedTasks = sortTasks(tasks, sortMode)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'rounded-2xl flex flex-col transition-all duration-150',
        isOver ? 'ring-2 ring-offset-2 ring-blue-400/70' : ''
      )}
      style={{
        width: '272px',
        flexShrink: 0,
        background: isOver ? 'rgba(99,102,241,0.08)' : 'var(--t-hover)',
      }}
    >
      {/* Column Header */}
      <div className="px-3.5 pt-3.5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
            <input
              value={col.title}
              onChange={e => onUpdateColumnTitle(col.id, e.target.value)}
              className="text-[12px] font-semibold bg-transparent border-none outline-none w-28 truncate"
              style={{ color: 'var(--t-text2)' }}
            />
            <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: col.color }}>
              {tasks.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Archive collapse toggle */}
            {isArchive && (
              <button
                onClick={() => setCollapsed(v => !v)}
                title={collapsed ? '펼치기' : '접기'}
                className="p-1 rounded-lg t-text3 t-hover transition-all"
              >
                <ChevronDown
                  className="w-3.5 h-3.5 transition-transform duration-200"
                  style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                />
              </button>
            )}

            {/* Priority Sort Toggle */}
            <button
              onClick={cycleSortMode}
              title="우선순위 정렬"
              className={clsx(
                'p-1 rounded-lg transition-all',
                sortMode !== 'default'
                  ? 'text-white'
                  : 't-text3 t-hover'
              )}
              style={sortMode !== 'default' ? { backgroundColor: col.color } : {}}
            >
              {sortMode !== 'default'
                ? <ArrowUp className="w-3 h-3" style={{ transform: sortMode === 'priority_desc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                : <ArrowUpDown className="w-3 h-3" />
              }
            </button>

            {/* Delete column */}
            <button
              onClick={() => onDeleteColumn(col.id)}
              className="p-1 rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>


      </div>

      {/* Task Drop Zone */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              ref={setNodeRef}
              className="flex-1 px-2.5 pb-2.5 space-y-2 overflow-y-auto"
              style={{ minHeight: '80px', maxHeight: 'calc(100vh - 200px)' }}
            >
              <SortableContext items={displayedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence>
                  {displayedTasks.map(task => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      columns={allColumns}
                      onDelete={() => onDeleteTask(task.id)}
                      onUpdate={onUpdateTask}
                      onClick={() => onClickTask(task)}
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>
              {tasks.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[11px] t-text3">드래그하거나 추가해 주세요</p>
                </div>
              )}
            </div>

            {/* Add Task Button */}
            <div className="px-2.5 pb-2.5">
              <button
                onClick={onAddTask}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-[12px] font-medium t-text3 t-hover transition-all group"
              >
                <Plus className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                태스크 추가
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed hint + invisible drop zone */}
      {collapsed && (
        <div className="px-3.5 pb-3 pt-1">
          <p className="text-[11px] t-text3">{tasks.length}개 보관됨</p>
          {/* keep droppable ref alive when collapsed */}
          <div ref={setNodeRef} style={{ height: 0, overflow: 'hidden' }} />
        </div>
      )}
    </motion.div>
  )
}
