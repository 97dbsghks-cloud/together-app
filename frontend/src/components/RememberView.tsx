import { useState } from 'react'
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, Check, X, GripVertical, Star, Pencil } from 'lucide-react'
import SmartDateInput from './SmartDateInput'
import { v4 as uuidv4 } from 'uuid'
import clsx from 'clsx'
import type { RememberItem } from '../App'

const STAGES = ['기획 설계', '계획 설계', '기본 설계', '실시 설계', '납품 후 지원', '기타'] as const
type Stage = typeof STAGES[number]

const STAGE_STYLE: Record<Stage, string> = {
  '기획 설계':    'bg-purple-100 text-purple-700',
  '계획 설계':    'bg-blue-100 text-blue-700',
  '기본 설계':    'bg-cyan-100 text-cyan-700',
  '실시 설계':    'bg-orange-100 text-orange-700',
  '납품 후 지원': 'bg-green-100 text-green-700',
  '기타':         'bg-gray-100 text-gray-500',
}

type Props = {
  items: RememberItem[]
  onChange: (items: RememberItem[]) => void
  isAdmin: boolean
  userName: string
}

const EMPTY: Omit<RememberItem, 'id'> = {
  content: '', importance: 1, stage: '기획 설계', assignee: '', deadline: '', done: false,
}

function StarPicker({ value, onChange, disabled }: { value?: number; onChange?: (v: number) => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState(0)
  const cur = hovered || value || 0
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !disabled && setHovered(n)}
          onMouseLeave={() => !disabled && setHovered(0)}
          className="p-0 leading-none transition-transform hover:scale-110 disabled:cursor-default"
        >
          <Star
            className="w-3.5 h-3.5"
            fill={n <= cur ? '#ff9f0a' : 'none'}
            stroke={n <= cur ? '#ff9f0a' : 'var(--t-border)'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

// ── Sortable row ──────────────────────────────────────────────────────────────
function SortableRow({
  item, idx, total, editingId, editForm, setEditForm,
  onStartEdit, onSaveEdit, onCancelEdit, onToggleDone, onDelete,
}: {
  item: RememberItem
  idx: number
  total: number
  editingId: string | null
  editForm: Omit<RememberItem, 'id'>
  setEditForm: (f: Omit<RememberItem, 'id'>) => void
  onStartEdit: (item: RememberItem) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onToggleDone: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const isEditing = editingId === item.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'grid grid-cols-[28px_28px_2fr_80px_1fr_1fr_1fr_72px] gap-0 group',
        idx < total - 1 ? 'border-b t-border' : '',
        item.done ? 't-surface2' : 't-hover-row',
        'transition-colors'
      )}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center cursor-grab active:cursor-grabbing t-text3 transition-colors"
        style={{ opacity: 0.5 }}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {isEditing ? (
        <>
          {/* Checkbox placeholder */}
          <div />
          <div className="px-3 py-3">
            <input
              autoFocus
              value={editForm.content}
              onChange={e => setEditForm({ ...editForm, content: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(item.id); if (e.key === 'Escape') onCancelEdit() }}
              className="w-full text-[13px] bg-transparent outline-none t-text"
            />
          </div>
          <div className="px-3 py-3 flex items-center">
            <StarPicker value={editForm.importance} onChange={v => setEditForm({ ...editForm, importance: v })} />
          </div>
          <div className="px-3 py-3">
            <select
              value={editForm.stage}
              onChange={e => setEditForm({ ...editForm, stage: e.target.value })}
              className="text-[12px] bg-transparent outline-none t-text2 cursor-pointer"
            >
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="px-3 py-3">
            <input
              value={editForm.assignee}
              onChange={e => setEditForm({ ...editForm, assignee: e.target.value })}
              className="w-full text-[13px] bg-transparent outline-none t-text2"
            />
          </div>
          <div className="px-1 py-1">
            <SmartDateInput
              value={editForm.deadline}
              onChange={v => setEditForm({ ...editForm, deadline: v })}
              className="bg-transparent t-border"
            />
          </div>
          <div className="flex items-center justify-center gap-1 pr-2">
            <button onClick={() => onSaveEdit(item.id)} className="p-1 rounded-md bg-blue-500 text-white">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={onCancelEdit} className="p-1 rounded-md t-text3 t-hover">
              <X className="w-3 h-3" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Checkbox */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => onToggleDone(item.id)}
              className={clsx(
                'rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                item.done ? 'border-blue-500 bg-blue-500' : 'hover:border-blue-400'
              )}
              style={{
                width: 18,
                height: 18,
                borderColor: item.done ? undefined : 'var(--t-border)',
              }}
            >
              {item.done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </button>
          </div>

          {/* Content */}
          <div className="px-3 py-3.5 cursor-pointer" onClick={() => !item.done && onStartEdit(item)}>
            <p className={clsx('text-[13px] leading-snug', item.done ? 'line-through t-text3' : 't-text')}>
              {item.content}
            </p>
          </div>

          {/* Importance */}
          <div className="px-3 py-3.5 flex items-center">
            <StarPicker value={item.importance ?? 1} disabled={item.done} />
          </div>

          {/* Stage */}
          <div className="px-3 py-3.5 flex items-center">
            <span className={clsx(
              'px-2 py-0.5 rounded-md text-[11px] font-semibold',
              item.done ? 'opacity-40' : '',
              STAGE_STYLE[item.stage as Stage] ?? 'bg-gray-100 text-gray-500'
            )}>
              {item.stage}
            </span>
          </div>

          {/* Assignee */}
          <div className="px-3 py-3.5 flex items-center">
            <span className={clsx('text-[13px]', item.done ? 't-text3 line-through' : 't-text2')}>
              {item.assignee || '—'}
            </span>
          </div>

          {/* Deadline */}
          <div className="px-3 py-3.5 flex items-center">
            <span className={clsx(
              'text-[12px]',
              item.done ? 't-text3 line-through' :
              item.deadline && new Date(item.deadline) < new Date() ? 'text-red-500 font-semibold' : 't-text2'
            )}>
              {item.deadline || '—'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onStartEdit(item)}
              className="p-1 rounded-md t-text3 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="수정"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 rounded-md t-text3 hover:text-red-400 hover:bg-red-50 transition-colors"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RememberView({ items, onChange, userName }: Props) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Omit<RememberItem, 'id'>>({ ...EMPTY })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleAdd = () => {
    if (!form.content.trim()) return
    onChange([...items, { id: uuidv4(), ...form, assignee: form.assignee || userName }])
    setForm({ ...EMPTY })
    setAdding(false)
  }

  const handleDelete = (id: string) => onChange(items.filter(i => i.id !== id))

  const toggleDone = (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const nowDone = !item.done
    const rest = items.filter(i => i.id !== id)
    const updated = { ...item, done: nowDone }
    if (nowDone) {
      onChange([...rest, updated])
    } else {
      const firstDoneIdx = rest.findIndex(i => i.done)
      if (firstDoneIdx === -1) onChange([...rest, updated])
      else onChange([...rest.slice(0, firstDoneIdx), updated, ...rest.slice(firstDoneIdx)])
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    if (oldIdx !== -1 && newIdx !== -1) onChange(arrayMove(items, oldIdx, newIdx))
  }

  const startEdit = (item: RememberItem) => {
    setEditingId(item.id)
    setEditForm({ content: item.content, stage: item.stage, assignee: item.assignee, deadline: item.deadline, done: item.done })
  }

  const saveEdit = (id: string) => {
    onChange(items.map(i => i.id === id ? { ...i, ...editForm } : i))
    setEditingId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold t-text">리멤버</h2>
            <p className="text-[11px] t-text3 mt-0.5">꼭 반영해야 할 내용을 기록해두세요</p>
          </div>
          <button
            onClick={() => { setAdding(true); setForm({ ...EMPTY }) }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            추가
          </button>
        </div>

        {/* Table */}
        <div className="t-surface rounded-2xl border t-border overflow-hidden" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
          {/* Table Header */}
          <div className="grid grid-cols-[28px_28px_2fr_80px_1fr_1fr_1fr_72px] gap-0 border-b t-border t-surface2">
            {['', '', '내용', '중요도', '설계단계', '담당자', '기한', ''].map((h, i) => (
              <div key={i} className="px-3 py-3 text-[11px] font-semibold t-text3 uppercase tracking-wide">{h}</div>
            ))}
          </div>

          {/* Add row */}
          {adding && (
            <div className="grid grid-cols-[28px_28px_2fr_80px_1fr_1fr_1fr_72px] gap-0 border-b border-blue-200/50" style={{ background: 'rgba(99,102,241,0.06)' }}>
              <div /><div />
              <div className="px-3 py-3">
                <input
                  autoFocus
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                  placeholder="내용을 입력하세요"
                  className="w-full text-[13px] bg-transparent outline-none t-text"
                  style={{ '--placeholder-color': 'var(--t-text3)' } as React.CSSProperties}
                />
              </div>
              <div className="px-3 py-3 flex items-center">
                <StarPicker value={form.importance} onChange={v => setForm(f => ({ ...f, importance: v }))} />
              </div>
              <div className="px-3 py-3">
                <select
                  value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value as Stage }))}
                  className="text-[12px] bg-transparent outline-none t-text2 cursor-pointer"
                >
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="px-3 py-3">
                <input
                  value={form.assignee}
                  onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                  placeholder="이름"
                  className="w-full text-[13px] bg-transparent outline-none t-text2"
                />
              </div>
              <div className="px-1 py-1">
                <SmartDateInput
                  value={form.deadline}
                  onChange={v => setForm(f => ({ ...f, deadline: v }))}
                  className="bg-transparent t-border"
                />
              </div>
              <div className="flex items-center justify-center gap-1 pr-2">
                <button onClick={handleAdd} className="p-1 rounded-md bg-blue-500 text-white hover:bg-blue-600">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setAdding(false)} className="p-1 rounded-md t-text3 t-hover">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Sortable rows */}
          {items.length === 0 && !adding ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(0,122,255,0.08)' }}>
                <span className="text-lg">🔖</span>
              </div>
              <p className="text-[12px] t-text3 font-medium">아직 기록된 내용이 없습니다</p>
              <p className="text-[11px] t-text3 mt-0.5 opacity-60">위 추가 버튼으로 기록을 시작해보세요</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map((item, idx) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    total={items.length}
                    editingId={editingId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onToggleDone={toggleDone}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  )
}
