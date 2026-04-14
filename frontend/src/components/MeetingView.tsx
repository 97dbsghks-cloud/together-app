import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, BookOpen, ArrowRight, Pencil } from 'lucide-react'
import { motion } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import clsx from 'clsx'
import type { Task, RememberItem } from '../App'
import SmartDateInput from './SmartDateInput'

export type MeetingActionItem = {
  id: string
  title: string
  assignee: string
  dueDate: string
  sent?: boolean
}

export type AgendaItem = {
  id: string
  title: string
  decisions: string
  decisionSent?: boolean
  actionItems: MeetingActionItem[]
}

export type MeetingNote = {
  id: string
  date: string
  title: string
  author: string
  attendees: string
  category: '삼우' | '발주처' | '협력사'
  agendaItems: AgendaItem[]
}

type Props = {
  meetings: MeetingNote[]
  columns: { id: string; title: string; color: string }[]
  onChange: (meetings: MeetingNote[]) => void
  onSendToRemember?: (item: RememberItem) => void
  onAddTask?: (colId: string, task: Partial<Task>) => void
}

const CATEGORIES = ['삼우', '발주처', '협력사'] as const
type Category = typeof CATEGORIES[number]

const newActionItem = (): MeetingActionItem => ({ id: uuidv4(), title: '', assignee: '', dueDate: '' })
const newAgendaItem = (): AgendaItem => ({ id: uuidv4(), title: '', decisions: '', actionItems: [] })

const EMPTY_NOTE = (category: Category): MeetingNote => ({
  id: uuidv4(),
  date: new Date().toISOString().slice(0, 10),
  title: '',
  author: '',
  attendees: '',
  category,
  agendaItems: [newAgendaItem()],
})

export default function MeetingView({ meetings, columns, onChange, onSendToRemember, onAddTask }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>('삼우')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<MeetingNote | null>(null)

  const filtered = meetings.filter(m => m.category === activeCategory)

  const startEdit = (note: MeetingNote) => {
    setEditingId(note.id)
    setDraft(JSON.parse(JSON.stringify(note)))
    setExpandedId(note.id)
  }

  const cancelEdit = () => { setEditingId(null); setDraft(null) }

  const saveEdit = () => {
    if (!draft) return
    onChange(meetings.map(m => m.id === draft.id ? draft : m))
    setEditingId(null)
    setDraft(null)
  }

  const addNote = () => {
    const note = EMPTY_NOTE(activeCategory)
    onChange([note, ...meetings])
    setExpandedId(note.id)
    setEditingId(note.id)
    setDraft(note)
  }

  const deleteNote = (id: string) => {
    onChange(meetings.filter(m => m.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  // --- Draft helpers ---
  const updateDraft = (patch: Partial<MeetingNote>) =>
    setDraft(p => p ? { ...p, ...patch } : p)

  const updateAgenda = (idx: number, patch: Partial<AgendaItem>) =>
    setDraft(p => {
      if (!p) return p
      const agendaItems = p.agendaItems.map((a, i) => i === idx ? { ...a, ...patch } : a)
      return { ...p, agendaItems }
    })

  const removeAgenda = (idx: number) =>
    setDraft(p => p ? { ...p, agendaItems: p.agendaItems.filter((_, i) => i !== idx) } : p)

  const addAgenda = () =>
    setDraft(p => p ? { ...p, agendaItems: [...p.agendaItems, newAgendaItem()] } : p)

  const addAction = (agendaIdx: number) =>
    updateAgenda(agendaIdx, { actionItems: [...(draft?.agendaItems[agendaIdx].actionItems ?? []), newActionItem()] })

  const updateAction = (agendaIdx: number, actionIdx: number, patch: Partial<MeetingActionItem>) =>
    setDraft(p => {
      if (!p) return p
      const agendaItems = p.agendaItems.map((a, i) => {
        if (i !== agendaIdx) return a
        return { ...a, actionItems: a.actionItems.map((ac, j) => j === actionIdx ? { ...ac, ...patch } : ac) }
      })
      return { ...p, agendaItems }
    })

  const removeAction = (agendaIdx: number, actionIdx: number) =>
    setDraft(p => {
      if (!p) return p
      const agendaItems = p.agendaItems.map((a, i) =>
        i === agendaIdx ? { ...a, actionItems: a.actionItems.filter((_, j) => j !== actionIdx) } : a
      )
      return { ...p, agendaItems }
    })

  // --- Send actions (read-only mode) ---
  const sendDecisionToRemember = (note: MeetingNote, agendaIdx: number) => {
    const agenda = note.agendaItems[agendaIdx]
    if (!onSendToRemember || !agenda.decisions.trim()) return
    onSendToRemember({
      id: uuidv4(),
      content: `[회의록 ${note.date}${agenda.title ? ' · ' + agenda.title : ''}] ${agenda.decisions}`,
      stage: '기타', assignee: '', deadline: '', importance: 2, done: false,
    })
    onChange(meetings.map(m => m.id === note.id
      ? { ...m, agendaItems: m.agendaItems.map((a, i) => i === agendaIdx ? { ...a, decisionSent: true } : a) }
      : m
    ))
  }

  const sendActionToBoard = (note: MeetingNote, agendaIdx: number, item: MeetingActionItem) => {
    const col = columns.find(c => c.id === 'todo') ?? columns[0]
    if (!onAddTask || !item.title.trim() || !col) return
    onAddTask(col.id, { title: item.title, assignee: item.assignee || undefined, dueDate: item.dueDate || undefined })
    onChange(meetings.map(m => m.id === note.id
      ? {
          ...m,
          agendaItems: m.agendaItems.map((a, i) =>
            i === agendaIdx
              ? { ...a, actionItems: a.actionItems.map(ac => ac.id === item.id ? { ...ac, sent: true } : ac) }
              : a
          ),
        }
      : m
    ))
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--t-bg)' }}>
      {/* Category sub-tabs — sliding pill */}
      <div className="t-glass flex-shrink-0 flex items-center px-5 border-b" style={{ borderColor: 'var(--t-glass-border)', height: 56 }}>
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="relative px-5 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
              style={{ color: activeCategory === cat ? '#fff' : 'var(--t-text2)', position: 'relative', zIndex: 1 }}
            >
              {activeCategory === cat && (
                <motion.span
                  layoutId="meeting-tab-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#6366f1', zIndex: -1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              {cat}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] t-text3">{filtered.length}개</span>
          <button
            onClick={addNote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
          >
            <Plus className="w-3.5 h-3.5" /> 새 회의록
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-[13px]">{activeCategory} 회의록이 없습니다.</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(note => {
            const isExpanded = expandedId === note.id
            const isEditing = editingId === note.id
            const d = isEditing ? draft! : note

            return (
              <div
                key={note.id}
                className="t-surface rounded-2xl border t-border overflow-hidden"
                style={{ boxShadow: isExpanded ? 'var(--t-shadow-lg)' : 'var(--t-shadow)' }}
              >
                {/* Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer t-hover transition-colors"
                  onClick={() => !isEditing && setExpandedId(isExpanded ? null : note.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold t-text">{d.date}</span>
                      {d.title
                        ? <span className="text-[13px] font-semibold t-text truncate max-w-[240px]">{d.title}</span>
                        : <span className="text-[13px] t-text3">제목 없음</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {!isEditing && (
                      <button onClick={() => startEdit(note)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => deleteNote(note.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : note.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t t-border pt-3 space-y-4">
                    {/* Meta row */}
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">날짜</label>
                        {isEditing
                          ? <SmartDateInput value={d.date} onChange={v => updateDraft({ date: v })} className="w-full bg-gray-50 rounded-lg" />
                          : <p className="text-[13px] text-gray-700">{d.date}</p>}
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">회의 제목</label>
                        {isEditing
                          ? <input value={d.title} placeholder="회의 제목..." onChange={e => updateDraft({ title: e.target.value })} className="w-full text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
                          : <p className="text-[13px] text-gray-700">{d.title || <span className="text-gray-300">-</span>}</p>}
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">작성자</label>
                        {isEditing
                          ? <input value={d.author} placeholder="이름" onChange={e => updateDraft({ author: e.target.value })} className="w-full text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
                          : <p className="text-[13px] text-gray-700">{d.author || <span className="text-gray-300">-</span>}</p>}
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">참석자</label>
                        {isEditing
                          ? <input value={d.attendees} placeholder="김OO, 이OO..." onChange={e => updateDraft({ attendees: e.target.value })} className="w-full text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
                          : <p className="text-[13px] text-gray-700">{d.attendees || <span className="text-gray-300">-</span>}</p>}
                      </div>
                    </div>

                    {/* Agenda items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">안건</label>
                        {isEditing && (
                          <button onClick={addAgenda} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                            <Plus className="w-3 h-3" /> 안건 추가
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {d.agendaItems.map((agenda, aIdx) => (
                          <div key={agenda.id} className="border border-gray-100 rounded-xl overflow-hidden">
                            {/* Agenda title */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                              <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">안건 {aIdx + 1}</span>
                              {isEditing ? (
                                <input
                                  value={agenda.title}
                                  onChange={e => updateAgenda(aIdx, { title: e.target.value })}
                                  placeholder="안건 제목..."
                                  className="flex-1 text-[13px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
                                />
                              ) : (
                                <p className="flex-1 text-[13px] font-semibold text-gray-700">{agenda.title || <span className="text-gray-300">제목 없음</span>}</p>
                              )}
                              {isEditing && d.agendaItems.length > 1 && (
                                <button onClick={() => removeAgenda(aIdx)} className="p-1 text-gray-300 hover:text-red-400 flex-shrink-0">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="px-3 py-2 space-y-2">
                              {/* Decisions */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-gray-400 font-semibold">결정사항</span>
                                  {!isEditing && !agenda.decisionSent && agenda.decisions.trim() && onSendToRemember && (
                                    <button onClick={() => sendDecisionToRemember(note, aIdx)} className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold">
                                      리멤버로 <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                {isEditing
                                  ? <textarea value={agenda.decisions} onChange={e => updateAgenda(aIdx, { decisions: e.target.value })} placeholder="결정된 사항..." rows={2} className="w-full text-[13px] border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 resize-none" />
                                  : <div className="flex items-start gap-2">
                                      <p className="flex-1 text-[13px] text-gray-600 whitespace-pre-wrap">{agenda.decisions || <span className="text-gray-300">-</span>}</p>
                                      {agenda.decisionSent && <span className="text-[10px] text-indigo-400 font-semibold flex-shrink-0 mt-0.5">리멤버에 추가됨 ✓</span>}
                                    </div>}
                              </div>

                              {/* Action items */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-gray-400 font-semibold">액션아이템</span>
                                  {isEditing && (
                                    <button onClick={() => addAction(aIdx)} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                                      <Plus className="w-3 h-3" /> 추가
                                    </button>
                                  )}
                                </div>

                                {agenda.actionItems.length === 0 && !isEditing && (
                                  <p className="text-[13px] text-gray-300">-</p>
                                )}

                                <div className="space-y-1.5">
                                  {agenda.actionItems.map((item, acIdx) => (
                                    <div key={item.id} className="flex items-center gap-2 py-1.5">
                                      {isEditing ? (
                                        <>
                                          <input value={item.title} onChange={e => updateAction(aIdx, acIdx, { title: e.target.value })} placeholder="액션아이템..." className="flex-1 text-[13px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 min-w-0" />
                                          <input value={item.assignee} onChange={e => updateAction(aIdx, acIdx, { assignee: e.target.value })} placeholder="담당자" className="w-20 text-[13px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400" />
                                          <SmartDateInput value={item.dueDate} onChange={v => updateAction(aIdx, acIdx, { dueDate: v })} className="bg-white" />
                                          <button onClick={() => removeAction(aIdx, acIdx)} className="p-1 text-gray-300 hover:text-red-400 flex-shrink-0">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <span className={clsx('flex-1 text-[13px] min-w-0 truncate', item.sent ? 'text-green-600' : 'text-gray-700')}>{item.title}</span>
                                          {item.assignee && <span className="text-[11px] text-gray-400 flex-shrink-0">{item.assignee}</span>}
                                          {item.dueDate && <span className="text-[11px] text-gray-400 flex-shrink-0">{item.dueDate}</span>}
                                          {item.sent
                                            ? <span className="text-[10px] text-green-500 font-semibold flex-shrink-0">태스크에 추가됨 ✓</span>
                                            : onAddTask && item.title.trim() && (
                                                <button onClick={() => sendActionToBoard(note, aIdx, item)} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold flex-shrink-0">
                                                  태스크로 <ArrowRight className="w-3 h-3" />
                                                </button>
                                              )
                                          }
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Edit actions */}
                    {isEditing && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveEdit} className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}>저장</button>
                        <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200">취소</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
