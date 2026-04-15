import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X, ArrowUpDown, ArrowUp, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import SortableTaskCard from './SortableTaskCard'
import type { Task, Column, TaskPriority } from '../App'

const PRIORITY_ORDER: Record<TaskPriority | 'none', number> = {
  high: 0, medium: 1, low: 2, none: 3,
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
  const [editingTitle, setEditingTitle] = useState(false)

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
      className={clsx('flex flex-col transition-all duration-150')}
      style={{
        width: '292px',
        flexShrink: 0,
      }}
    >
      {/* Column Header — standalone, outside the card */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2.5">
          {editingTitle ? (
            <input
              autoFocus
              value={col.title}
              onChange={e => onUpdateColumnTitle(col.id, e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
              className="text-[15px] font-bold bg-transparent border-none outline-none w-36"
              style={{ color: 'var(--t-text)' }}
            />
          ) : (
            <h3
              className="text-[15px] font-bold cursor-pointer select-none"
              style={{ color: 'var(--t-text)' }}
              onDoubleClick={() => setEditingTitle(true)}
            >
              {col.title}
            </h3>
          )}
          {/* Count pill */}
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: col.color + '22', color: col.color }}
          >
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Archive collapse */}
          {isArchive && (
            <button
              onClick={() => setCollapsed(v => !v)}
              title={collapsed ? '펼치기' : '접기'}
              className="w-7 h-7 flex items-center justify-center rounded-lg t-text3 t-hover transition-all"
            >
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-200"
                style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              />
            </button>
          )}
          {/* Sort */}
          <button
            onClick={cycleSortMode}
            title="우선순위 정렬"
            className={clsx(
              'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
              sortMode !== 'default' ? 'text-white' : 't-text3 t-hover'
            )}
            style={sortMode !== 'default' ? { backgroundColor: col.color } : {}}
          >
            {sortMode !== 'default'
              ? <ArrowUp className="w-3.5 h-3.5" style={{ transform: sortMode === 'priority_desc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              : <ArrowUpDown className="w-3.5 h-3.5" />
            }
          </button>
          {/* Delete */}
          <button
            onClick={() => onDeleteColumn(col.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg t-text3 t-hover hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Column body — white card */}
      <div
        className={clsx(
          'flex-1 flex flex-col rounded-2xl transition-all duration-150',
          isOver ? 'ring-2 ring-blue-400/60' : ''
        )}
        style={{
          background: 'var(--t-surface)',
          border: '1px solid var(--t-border)',
          boxShadow: isOver
            ? '0 0 0 4px rgba(99,102,241,0.12)'
            : '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
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
                className="p-2.5 space-y-2 overflow-y-auto"
                style={{ minHeight: '60px', maxHeight: 'calc(100vh - 240px)' }}
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
                  <div className="py-10 text-center">
                    <p className="text-[11px] t-text3">태스크를 추가하거나 드래그하세요</p>
                  </div>
                )}
              </div>

              {/* Add Task */}
              <div className="px-2.5 pb-2.5">
                <button
                  onClick={onAddTask}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all group"
                  style={{
                    color: 'var(--t-text3)',
                    border: '1.5px dashed var(--t-border)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = col.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--t-border)')}
                >
                  <Plus className="w-3.5 h-3.5 transition-colors group-hover:text-blue-500" />
                  태스크 추가
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed */}
        {collapsed && (
          <div className="px-4 py-3">
            <p className="text-[11px] t-text3">{tasks.length}개 보관됨</p>
            <div ref={setNodeRef} style={{ height: 0, overflow: 'hidden' }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
