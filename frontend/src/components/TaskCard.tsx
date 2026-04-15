import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User, CheckSquare, Check, ChevronDown, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { Task, TaskPriority } from '../App'

const PRIORITY_STYLES: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low:    { label: '낮음', color: '#34c759', bg: 'rgba(52,199,89,0.12)' },
  medium: { label: '중간', color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)' },
  high:   { label: '높음', color: '#ff3b30', bg: 'rgba(255,59,48,0.12)' },
}

type Column = { id: string; title: string; color: string }

type Props = {
  task: Task
  columns?: Column[]
  isDragging?: boolean
  onDelete?: () => void
  onUpdate?: (updated: Task) => void
  onClick?: () => void
}

export default function TaskCard({ task, isDragging, onDelete, onUpdate, onClick }: Props) {
  const [expanded, setExpanded] = useState(false)

  const totalCheck = task.checklist?.length ?? 0
  const doneCheck = task.checklist?.filter(c => c.done).length ?? 0
  const priority = task.priority ? PRIORITY_STYLES[task.priority] : null
  // col is no longer displayed on the card (redundant with column position)

  const toggleCheckItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onUpdate) return
    onUpdate({ ...task, checklist: task.checklist?.map(c => c.id === id ? { ...c, done: !c.done } : c) })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={clsx(
        'rounded-2xl select-none transition-all duration-150 overflow-hidden group',
        isDragging
          ? 'rotate-1 shadow-2xl opacity-95 cursor-grabbing'
          : 'cursor-pointer hover:shadow-md'
      )}
      style={{
        background: 'var(--t-surface2)',
        border: '1px solid var(--t-border)',
      }}
    >
      {/* Priority accent bar */}
      {priority && (
        <div className="h-1 w-full rounded-t-2xl" style={{ background: priority.color }} />
      )}
      <div className="p-4">
        {/* Top row: priority pill + delete */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority */}
            {priority && (
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: priority.bg, color: priority.color }}
              >
                {priority.label}
              </span>
            )}
          </div>
          {!isDragging && onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
              style={{ color: '#ef4444' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title */}
        <p className="text-[14px] font-bold leading-snug mb-1" style={{ color: 'var(--t-text)' }}>
          {task.title}
        </p>

        {/* Description */}
        {task.description && (
          <p className="text-[12px] leading-relaxed line-clamp-2 mt-1" style={{ color: 'var(--t-text3)' }}>
            {task.description}
          </p>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {task.tags.map(tag => (
              <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--t-border)', color: 'var(--t-text2)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Checklist progress */}
        {totalCheck > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium" style={{ color: 'var(--t-text3)' }}>{doneCheck}/{totalCheck} 완료</span>
              <span className="text-[10px] font-bold" style={{ color: 'var(--t-text3)' }}>{Math.round((doneCheck / totalCheck) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-border)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(doneCheck / totalCheck) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
            </div>
            {!isDragging && (
              <button
                onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                className="mt-2 text-[11px] flex items-center gap-1 transition-colors"
                style={{ color: 'var(--t-text3)' }}
              >
                <CheckSquare className="w-3 h-3" />
                체크리스트
                <ChevronDown className={clsx('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2 space-y-1.5">
                {task.checklist?.map(item => (
                  <button key={item.id} onClick={e => toggleCheckItem(item.id, e)} className="flex items-center gap-2 w-full text-left">
                    <div className={clsx('w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all', item.done ? 'border-blue-500 bg-blue-500' : 'border-gray-300')}>
                      {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={clsx('text-[12px]', item.done ? 'line-through' : '')} style={{ color: item.done ? 'var(--t-text3)' : 'var(--t-text2)' }}>{item.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {(task.dueDate || task.assignee) && (
          <div className="flex items-center gap-3 mt-3 pt-2.5" style={{ borderTop: '1px solid var(--t-border)' }}>
            {task.dueDate && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--t-text3)' }}>
                <Calendar className="w-3 h-3" />
                {task.dueDate}
              </span>
            )}
            {task.assignee && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--t-text3)' }}>
                <User className="w-3 h-3" />
                {task.assignee}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
