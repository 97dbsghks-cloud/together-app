import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User, CheckSquare, Check, ChevronDown, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { Task, TaskPriority } from '../App'

const PRIORITY_STYLES: Record<TaskPriority, { label: string; color: string; bg: string; bar: string }> = {
  low: { label: '낮음', color: '#34c759', bg: 'rgba(52,199,89,0.1)', bar: '#34c759' },
  medium: { label: '중간', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', bar: '#ff9f0a' },
  high: { label: '높음', color: '#ff3b30', bg: 'rgba(255,59,48,0.1)', bar: '#ff3b30' },
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

  const toggleCheckItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onUpdate) return
    onUpdate({ ...task, checklist: task.checklist?.map(c => c.id === id ? { ...c, done: !c.done } : c) })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className={clsx(
        't-surface rounded-xl select-none transition-all duration-200 overflow-hidden flex',
        isDragging
          ? 'rotate-2 apple-shadow-hover opacity-95 cursor-grabbing'
          : 'apple-shadow hover:apple-shadow-lg group cursor-pointer'
      )}
    >
      {/* Priority accent bar on left */}
      {priority && !isDragging && (
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: priority.bar }} />
      )}

      <div className="flex-1 p-3.5">
        {/* Priority badge + delete */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {priority && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: priority.color, backgroundColor: priority.bg }}>
                {priority.label}
              </span>
            )}
            {task.tags?.map(tag => (
              <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full t-surface2 t-text2">
                #{tag}
              </span>
            ))}
          </div>
          {!isDragging && onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Title */}
        <p className="text-[13px] font-semibold t-text leading-snug group-hover:text-blue-500 transition-colors">
          {task.title}
        </p>

        {/* Description */}
        {task.description && (
          <p className="text-[11px] t-text3 mt-1 leading-relaxed line-clamp-2">{task.description}</p>
        )}

        {/* Checklist progress */}
        {totalCheck > 0 && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-medium">{doneCheck} / {totalCheck} 항목</span>
              <span className="text-[10px] text-gray-400 font-medium">{Math.round((doneCheck / totalCheck) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full t-surface2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(doneCheck / totalCheck) * 100}%`, background: 'linear-gradient(90deg, #007aff, #5856d6)' }} />
            </div>
          </div>
        )}

        {/* Expand checklist inline */}
        {totalCheck > 0 && !isDragging && (
          <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }} className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            <CheckSquare className="w-3 h-3" />
            체크리스트
            <ChevronDown className={clsx('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2 space-y-1">
                {task.checklist?.map(item => (
                  <button key={item.id} onClick={e => toggleCheckItem(item.id, e)} className="flex items-center gap-2 w-full text-left">
                    <div className={clsx('w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all', item.done ? 'bg-blue-500 border-blue-500' : 'border-gray-300')}>
                      {item.done && <Check className="w-2 h-2 text-white" />}
                    </div>
                    <span className={clsx('text-[11px] transition-colors', item.done ? 'text-gray-300 line-through' : 'text-gray-600')}>{item.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Meta */}
        {(task.dueDate || task.assignee) && (
          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t t-border2">
            {task.dueDate && (
              <span className="flex items-center gap-1 text-[10px] t-text3 font-medium">
                <Calendar className="w-3 h-3" />
                {task.dueDate}
              </span>
            )}
            {task.assignee && (
              <span className="flex items-center gap-1 text-[10px] t-text3 font-medium">
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
