import { useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import clsx from 'clsx'
import type { RememberItem } from '../App'

const STAGES = ['기획 설계', '계획 설계', '기본 설계', '실시 설계', '납품 후 지원', '기타'] as const
type Stage = typeof STAGES[number]

const STAGE_STYLE: Record<Stage, string> = {
  '기획 설계':   'bg-purple-100 text-purple-700',
  '계획 설계':   'bg-blue-100 text-blue-700',
  '기본 설계':   'bg-cyan-100 text-cyan-700',
  '실시 설계':   'bg-orange-100 text-orange-700',
  '납품 후 지원':'bg-green-100 text-green-700',
  '기타':        'bg-gray-100 text-gray-500',
}

type Props = {
  items: RememberItem[]
  onChange: (items: RememberItem[]) => void
  isAdmin: boolean
  userName: string
}

const EMPTY: Omit<RememberItem, 'id'> = {
  content: '',
  stage: '기획 설계',
  assignee: '',
  deadline: '',
}

export default function RememberView({ items, onChange, userName }: Props) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Omit<RememberItem, 'id'>>({ ...EMPTY })

  const handleAdd = () => {
    if (!form.content.trim()) return
    const newItem: RememberItem = { id: uuidv4(), ...form, assignee: form.assignee || userName }
    onChange([...items, newItem])
    setForm({ ...EMPTY })
    setAdding(false)
  }

  const handleDelete = (id: string) => {
    onChange(items.filter(i => i.id !== id))
  }

  const startEdit = (item: RememberItem) => {
    setEditingId(item.id)
    setEditForm({ content: item.content, stage: item.stage, assignee: item.assignee, deadline: item.deadline })
  }

  const saveEdit = (id: string) => {
    onChange(items.map(i => i.id === id ? { ...i, ...editForm } : i))
    setEditingId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">리멤버</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">꼭 반영해야 할 내용을 기록해두세요</p>
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
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-0 border-b border-gray-100 bg-gray-50/60">
            {['내용', '설계단계', '담당자', '기한', ''].map((h, i) => (
              <div key={i} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</div>
            ))}
          </div>

          {/* Add row */}
          {adding && (
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-0 border-b border-blue-100 bg-blue-50/30">
              <div className="px-4 py-3">
                <input
                  autoFocus
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                  placeholder="내용을 입력하세요"
                  className="w-full text-[13px] bg-transparent outline-none text-gray-800 placeholder-gray-300"
                />
              </div>
              <div className="px-4 py-3">
                <select
                  value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value as Stage }))}
                  className="text-[12px] bg-transparent outline-none text-gray-700 cursor-pointer"
                >
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="px-4 py-3">
                <input
                  value={form.assignee}
                  onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                  placeholder="이름"
                  className="w-full text-[13px] bg-transparent outline-none text-gray-700 placeholder-gray-300"
                />
              </div>
              <div className="px-4 py-3">
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="text-[12px] bg-transparent outline-none text-gray-700"
                />
              </div>
              <div className="flex items-center justify-center gap-1 pr-2">
                <button onClick={handleAdd} className="p-1 rounded-md bg-blue-500 text-white hover:bg-blue-600">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setAdding(false)} className="p-1 rounded-md text-gray-400 hover:bg-gray-100">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Rows */}
          {items.length === 0 && !adding ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(0,122,255,0.08)' }}>
                <span className="text-lg">🔖</span>
              </div>
              <p className="text-[12px] text-gray-400 font-medium">아직 기록된 내용이 없습니다</p>
              <p className="text-[11px] text-gray-300 mt-0.5">위 추가 버튼으로 기록을 시작해보세요</p>
            </div>
          ) : items.map((item, idx) => (
            <div
              key={item.id}
              className={clsx(
                'grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-0 group',
                idx < items.length - 1 && 'border-b border-gray-50',
                'hover:bg-gray-50/60 transition-colors'
              )}
            >
              {editingId === item.id ? (
                <>
                  <div className="px-4 py-3">
                    <input
                      autoFocus
                      value={editForm.content}
                      onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null) }}
                      className="w-full text-[13px] bg-transparent outline-none text-gray-800"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <select
                      value={editForm.stage}
                      onChange={e => setEditForm(f => ({ ...f, stage: e.target.value as Stage }))}
                      className="text-[12px] bg-transparent outline-none text-gray-700 cursor-pointer"
                    >
                      {STAGES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="px-4 py-3">
                    <input
                      value={editForm.assignee}
                      onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))}
                      className="w-full text-[13px] bg-transparent outline-none text-gray-700"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <input
                      type="date"
                      value={editForm.deadline}
                      onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                      className="text-[12px] bg-transparent outline-none text-gray-700"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1 pr-2">
                    <button onClick={() => saveEdit(item.id)} className="p-1 rounded-md bg-blue-500 text-white">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded-md text-gray-400 hover:bg-gray-100">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-4 py-3.5 cursor-pointer" onClick={() => startEdit(item)}>
                    <p className="text-[13px] text-gray-800 leading-snug">{item.content}</p>
                  </div>
                  <div className="px-4 py-3.5 flex items-center">
                    <span className={clsx('px-2 py-0.5 rounded-md text-[11px] font-semibold', STAGE_STYLE[item.stage as Stage] ?? 'bg-gray-100 text-gray-500')}>
                      {item.stage}
                    </span>
                  </div>
                  <div className="px-4 py-3.5 flex items-center">
                    <span className="text-[13px] text-gray-600">{item.assignee || '—'}</span>
                  </div>
                  <div className="px-4 py-3.5 flex items-center">
                    <span className={clsx('text-[12px]', item.deadline && new Date(item.deadline) < new Date() ? 'text-red-500 font-semibold' : 'text-gray-500')}>
                      {item.deadline ? item.deadline : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDelete(item.id)} className="p-1 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
