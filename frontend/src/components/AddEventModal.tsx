import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { CalendarEvent, ProjectMeta } from '../App'

const COLORS = [
  '#ff3b30', '#ff9f0a', '#ffcc00', '#34c759',
  '#007aff', '#5856d6', '#ff2d55', '#5ac8fa',
  '#32ade6', '#ac8e68', '#636366', '#1c1c1e',
]

type Props = {
  date: string
  projects: ProjectMeta[]
  activeProjectId: string | null
  editingEvent?: CalendarEvent
  editingProjectId?: string
  lockedProjectId?: string
  onClose: () => void
  onAdd: (projectId: string, event: CalendarEvent) => void
}

export default function AddEventModal({
  date, projects, activeProjectId,
  editingEvent, editingProjectId, lockedProjectId,
  onClose, onAdd,
}: Props) {
  const [title, setTitle] = useState(editingEvent?.title ?? '')
  const [startDate, setStartDate] = useState(editingEvent?.date ?? date)
  const [endDate, setEndDate] = useState(editingEvent?.endDate ?? '')
  const [color, setColor] = useState(editingEvent?.color ?? '#007aff')
  const [description, setDescription] = useState(editingEvent?.description ?? '')
  const [important, setImportant] = useState(editingEvent?.important ?? false)
  const [projectId, setProjectId] = useState(lockedProjectId ?? editingProjectId ?? activeProjectId ?? projects[0]?.id ?? '')

  const isEditing = !!editingEvent

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd(projectId, {
      id: editingEvent?.id ?? uuidv4(),
      title: title.trim(),
      date: startDate,
      endDate: endDate || undefined,
      color,
      description: description.trim() || undefined,
      important: important || undefined,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{isEditing ? '일정 수정' : '일정 추가'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">제목</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="일정 제목을 입력하세요"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">종료일 (선택)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </div>

          {!lockedProjectId && (
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">프로젝트</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-2">색상</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                  }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setImportant(v => !v)}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              important
                ? 'border-orange-400 bg-orange-50 text-orange-600'
                : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'
            }`}
          >
            <span className="text-base leading-none">{important ? '⭐' : '☆'}</span>
            주요 일정으로 등록
            <span className="ml-auto text-[10px] font-normal opacity-60">종합 캘린더 목록에 표시</span>
          </button>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">메모 (선택)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="간단한 메모..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
          >
            {isEditing ? '저장하기' : '추가하기'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
