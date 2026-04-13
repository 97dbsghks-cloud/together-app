import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Task, Column, TaskPriority } from '../App'
import SmartDateInput from './SmartDateInput'

type Props = {
  columnId: string
  columns: Column[]
  onClose: () => void
  onAdd: (colId: string, task: Partial<Task>) => void
}

export default function AddTaskModal({ columnId, columns, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [tags, setTags] = useState('')
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [colId, setColId] = useState(columnId)

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd(colId, {
      title: title.trim(),
      description: description.trim() || undefined,
      assignee: assignee.trim() || undefined,
      dueDate: dueDate || undefined,
      priority,
      tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
    })
  }

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return
    setChecklist(prev => [...prev, { id: uuidv4(), text: newCheckItem.trim(), done: false }])
    setNewCheckItem('')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="t-surface rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.28), 0 8px 20px rgba(0,0,0,0.12)' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b t-border">
          <h3 className="text-base font-semibold t-text">새 태스크 추가</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg t-text3 t-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">제목 *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="태스크 이름을 입력하세요"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">설명</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="태스크에 대한 설명을 입력하세요"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {/* Row: Priority + Column */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">우선순위</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="low">🟢 낮음</option>
                <option value="medium">🟡 중간</option>
                <option value="high">🔴 높음</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">열(Column)</label>
              <select
                value={colId}
                onChange={e => setColId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">담당자</label>
              <input
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                placeholder="홍길동"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">마감일</label>
              <SmartDateInput value={dueDate} onChange={setDueDate} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">태그 (쉼표로 구분)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="도면, 내역, 인허가"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Checklist */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">체크리스트</label>
            <div className="space-y-1.5 mb-2">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1 bg-gray-50 px-2 py-1 rounded-lg">✓ {item.text}</span>
                  <button onClick={() => setChecklist(prev => prev.filter(c => c.id !== item.id))} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
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
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button onClick={addCheckItem} className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                <Plus className="w-4 h-4" />
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
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: title.trim() ? 'linear-gradient(135deg, #007aff, #5856d6)' : '#9ca3af' }}
          >
            태스크 추가
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
