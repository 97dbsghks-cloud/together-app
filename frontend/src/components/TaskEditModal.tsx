import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Trash2, Check, ArrowRight } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import clsx from 'clsx'
import type { Task, Column, TaskPriority } from '../App'

type Props = {
  task: Task
  columns: Column[]
  onClose: () => void
  onSave: (updated: Task) => void
  onDelete: () => void
}

export default function TaskEditModal({ task, columns, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [assignee, setAssignee] = useState(task.assignee || '')
  const [dueDate, setDueDate] = useState(task.dueDate || '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'medium')
  const [tags, setTags] = useState(task.tags?.join(', ') || '')
  const [columnId, setColumnId] = useState(task.columnId)
  const [checklist, setChecklist] = useState(task.checklist || [])
  const [newCheckItem, setNewCheckItem] = useState('')

  const currentCol = columns.find(c => c.id === columnId)

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
      assignee: assignee.trim() || undefined,
      dueDate: dueDate || undefined,
      priority,
      tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      columnId,
      checklist: checklist.length > 0 ? checklist : undefined,
    })
    onClose()
  }

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return
    setChecklist(prev => [...prev, { id: uuidv4(), text: newCheckItem.trim(), done: false }])
    setNewCheckItem('')
  }

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
  }

  const removeCheckItem = (id: string) => {
    setChecklist(prev => prev.filter(c => c.id !== id))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentCol?.color || '#6e6e73' }} />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{currentCol?.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (confirm('이 태스크를 삭제할까요?')) { onDelete(); onClose() } }}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">제목</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">설명</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="태스크에 대한 상세 설명..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {/* Move to column */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">
              <ArrowRight className="inline w-3 h-3 mr-1" />
              열 이동
            </label>
            <div className="flex flex-wrap gap-2">
              {columns.map(col => (
                <button
                  key={col.id}
                  onClick={() => setColumnId(col.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all',
                    columnId === col.id
                      ? 'text-white border-transparent'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  )}
                  style={columnId === col.id ? { backgroundColor: col.color, borderColor: col.color } : {}}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: columnId === col.id ? 'rgba(255,255,255,0.6)' : col.color }} />
                  {col.title}
                </button>
              ))}
            </div>
          </div>

          {/* Priority + Assignee + Date */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">우선순위</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="low">🟢 낮음</option>
                <option value="medium">🟡 중간</option>
                <option value="high">🔴 높음</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">담당자</label>
              <input
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                placeholder="이름"
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">마감일</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">태그 (쉼표 구분)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="도면, 내역, 인허가"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Checklist */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">체크리스트</label>
            <div className="space-y-1.5 mb-2">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button onClick={() => toggleCheck(item.id)} className={clsx('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all', item.done ? 'bg-blue-500 border-blue-500' : 'border-gray-300')}>
                    {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <span className={clsx('text-xs flex-1 transition-colors', item.done ? 'line-through text-gray-300' : 'text-gray-600')}>{item.text}</span>
                  <button onClick={() => removeCheckItem(item.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCheckItem}
                onChange={e => setNewCheckItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCheckItem()}
                placeholder="항목 입력 후 Enter"
                className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button onClick={addCheckItem} className="px-2.5 py-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
          >
            저장하기
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
