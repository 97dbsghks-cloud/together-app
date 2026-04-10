import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, BookOpen, ArrowRight } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import clsx from 'clsx'
import type { Task, RememberItem } from '../App'

export type AgendaItem = {
  id: string
  title: string
  decisions: string
  decisionSent?: boolean
}

export type MeetingActionItem = {
  id: string
  title: string
  assignee: string
  dueDate: string
  sent?: boolean
}

export type MeetingNote = {
  id: string
  date: string
  author: string
  attendees: string
  category: '삼우' | '발주처' | '협력사'
  agendaItems: AgendaItem[]
  actionItems: MeetingActionItem[]
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

const EMPTY_NOTE = (category: Category): MeetingNote => ({
  id: uuidv4(),
  date: new Date().toISOString().slice(0, 10),
  author: '',
  attendees: '',
  category,
  agendaItems: [{ id: uuidv4(), title: '', decisions: '' }],
  actionItems: [],
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

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const saveEdit = () => {
    if (!draft) return
    onChange(meetings.map(m => m.id === draft.id ? draft : m))
    setEditingId(null)
    setDraft(null)
  }

  const addNote = () => {
    const note = EMPTY_NOTE(activeCategory)
    const updated = [note, ...meetings]
    onChange(updated)
    setExpandedId(note.id)
    setEditingId(note.id)
    setDraft(note)
  }

  const deleteNote = (id: string) => {
    onChange(meetings.filter(m => m.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  // Agenda helpers
  const addAgendaItem = () => {
    if (!draft) return
    setDraft({ ...draft, agendaItems: [...draft.agendaItems, { id: uuidv4(), title: '', decisions: '' }] })
  }

  const updateAgendaItem = (idx: number, field: keyof AgendaItem, value: string) => {
    if (!draft) return
    const updated = draft.agendaItems.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setDraft({ ...draft, agendaItems: updated })
  }

  const removeAgendaItem = (idx: number) => {
    if (!draft) return
    setDraft({ ...draft, agendaItems: draft.agendaItems.filter((_, i) => i !== idx) })
  }

  // Action item helpers
  const addActionItem = () => {
    if (!draft) return
    setDraft({ ...draft, actionItems: [...draft.actionItems, { id: uuidv4(), title: '', assignee: '', dueDate: '' }] })
  }

  const updateActionItem = (idx: number, field: keyof MeetingActionItem, value: string) => {
    if (!draft) return
    const updated = draft.actionItems.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setDraft({ ...draft, actionItems: updated })
  }

  const removeActionItem = (idx: number) => {
    if (!draft) return
    setDraft({ ...draft, actionItems: draft.actionItems.filter((_, i) => i !== idx) })
  }

  // Send decision to remember
  const sendDecisionToRemember = (note: MeetingNote, agendaIdx: number) => {
    const agenda = note.agendaItems[agendaIdx]
    if (!onSendToRemember || !agenda.decisions.trim()) return
    onSendToRemember({
      id: uuidv4(),
      content: `[회의록 ${note.date}${agenda.title ? ' · ' + agenda.title : ''}] ${agenda.decisions}`,
      stage: '기타',
      assignee: '',
      deadline: '',
      importance: 2,
      done: false,
    })
    // mark decisionSent
    onChange(meetings.map(m => m.id === note.id
      ? { ...m, agendaItems: m.agendaItems.map((a, i) => i === agendaIdx ? { ...a, decisionSent: true } : a) }
      : m
    ))
  }

  // Send action item to board
  const sendActionItemToBoard = (note: MeetingNote, item: MeetingActionItem) => {
    const col = columns.find(c => c.id === 'todo') ?? columns[0]
    if (!onAddTask || !item.title.trim() || !col) return
    onAddTask(col.id, {
      title: item.title,
      assignee: item.assignee || undefined,
      dueDate: item.dueDate || undefined,
    })
    onChange(meetings.map(m => m.id === note.id
      ? { ...m, actionItems: m.actionItems.map(a => a.id === item.id ? { ...a, sent: true } : a) }
      : m
    ))
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Category sub-tabs */}
      <div className="flex-shrink-0 flex items-center gap-0 px-5 border-b bg-gray-50/60" style={{ borderColor: 'rgba(0,0,0,0.07)', height: 38 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              'px-3.5 py-1 rounded-lg text-[11px] font-semibold transition-all mr-1',
              activeCategory === cat ? 'text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/60'
            )}
            style={activeCategory === cat ? { background: 'linear-gradient(135deg, #007aff, #5856d6)' } : {}}
          >
            {cat}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{filtered.length}개</span>
          <button
            onClick={addNote}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
          >
            <Plus className="w-3 h-3" /> 새 회의록
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

        <div className="space-y-3 max-w-3xl mx-auto">
          {filtered.map(note => {
            const isExpanded = expandedId === note.id
            const isEditing = editingId === note.id
            const d = isEditing ? draft! : note

            return (
              <div
                key={note.id}
                className="bg-white rounded-2xl border overflow-hidden"
                style={{ borderColor: 'rgba(0,0,0,0.07)', boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/60 transition-colors"
                  onClick={() => !isEditing && setExpandedId(isExpanded ? null : note.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-bold text-gray-800">{d.date}</span>
                      {d.author && <span className="text-[11px] text-gray-500">{d.author}</span>}
                      {d.attendees && <span className="text-[11px] text-gray-400 truncate max-w-[180px]">참석: {d.attendees}</span>}
                      {d.agendaItems[0]?.title && (
                        <span className="text-[11px] text-blue-500 font-medium truncate max-w-[160px]">{d.agendaItems[0].title}{d.agendaItems.length > 1 ? ` 외 ${d.agendaItems.length - 1}건` : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {!isEditing && (
                      <button onClick={() => startEdit(note)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors text-[11px] font-semibold">
                        편집
                      </button>
                    )}
                    <button onClick={() => deleteNote(note.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-4">
                    {/* Date / Author / Attendees */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">날짜</label>
                        {isEditing ? (
                          <input type="date" value={d.date}
                            onChange={e => setDraft(p => p ? { ...p, date: e.target.value } : p)}
                            className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400"
                          />
                        ) : <p className="text-[12px] text-gray-700">{d.date}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">작성자</label>
                        {isEditing ? (
                          <input value={d.author} placeholder="작성자 이름"
                            onChange={e => setDraft(p => p ? { ...p, author: e.target.value } : p)}
                            className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400"
                          />
                        ) : <p className="text-[12px] text-gray-700">{d.author || <span className="text-gray-300">-</span>}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">참석자</label>
                        {isEditing ? (
                          <input value={d.attendees} placeholder="홍길동, 김철수..."
                            onChange={e => setDraft(p => p ? { ...p, attendees: e.target.value } : p)}
                            className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400"
                          />
                        ) : <p className="text-[12px] text-gray-700">{d.attendees || <span className="text-gray-300">-</span>}</p>}
                      </div>
                    </div>

                    {/* Agenda items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">안건 / 결정사항</label>
                        {isEditing && (
                          <button onClick={addAgendaItem} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                            <Plus className="w-3 h-3" /> 안건 추가
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {d.agendaItems.map((agenda, idx) => (
                          <div key={agenda.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">안건 {idx + 1}</span>
                              {isEditing ? (
                                <input
                                  value={agenda.title}
                                  onChange={e => updateAgendaItem(idx, 'title', e.target.value)}
                                  placeholder="안건 내용..."
                                  className="flex-1 text-[12px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
                                />
                              ) : (
                                <p className="flex-1 text-[12px] font-semibold text-gray-700">{agenda.title || <span className="text-gray-300">제목 없음</span>}</p>
                              )}
                              {isEditing && d.agendaItems.length > 1 && (
                                <button onClick={() => removeAgendaItem(idx)} className="p-1 text-gray-300 hover:text-red-400 flex-shrink-0">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-gray-400 font-medium">결정사항</span>
                                {!isEditing && agenda.decisions.trim() && onSendToRemember && (
                                  agenda.decisionSent ? (
                                    <span className="text-[10px] text-indigo-400 font-semibold">리멤버에 추가됨 ✓</span>
                                  ) : (
                                    <button
                                      onClick={() => sendDecisionToRemember(note, idx)}
                                      className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold"
                                    >
                                      리멤버로 <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )
                                )}
                              </div>
                              {isEditing ? (
                                <textarea
                                  value={agenda.decisions}
                                  onChange={e => updateAgendaItem(idx, 'decisions', e.target.value)}
                                  placeholder="결정된 사항..."
                                  rows={2}
                                  className="w-full text-[12px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 resize-none"
                                />
                              ) : (
                                <p className="text-[12px] text-gray-600 whitespace-pre-wrap">{agenda.decisions || <span className="text-gray-300">-</span>}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">액션아이템</label>
                        {isEditing && (
                          <button onClick={addActionItem} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                            <Plus className="w-3 h-3" /> 추가
                          </button>
                        )}
                      </div>

                      {d.actionItems.length === 0 && !isEditing && (
                        <p className="text-[12px] text-gray-300">-</p>
                      )}

                      <div className="space-y-1.5">
                        {d.actionItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className={clsx('flex items-center gap-2 p-2 rounded-xl', item.sent ? 'bg-green-50' : 'bg-gray-50')}
                          >
                            {isEditing ? (
                              <>
                                <input
                                  value={item.title}
                                  onChange={e => updateActionItem(idx, 'title', e.target.value)}
                                  placeholder="액션아이템..."
                                  className="flex-1 text-[12px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 min-w-0"
                                />
                                <input
                                  value={item.assignee}
                                  onChange={e => updateActionItem(idx, 'assignee', e.target.value)}
                                  placeholder="담당자"
                                  className="w-20 text-[12px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
                                />
                                <input
                                  type="date"
                                  value={item.dueDate}
                                  onChange={e => updateActionItem(idx, 'dueDate', e.target.value)}
                                  className="w-32 text-[12px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
                                />
                                <button onClick={() => removeActionItem(idx)} className="p-1 text-gray-300 hover:text-red-400 flex-shrink-0">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className={clsx('flex-1 text-[12px] min-w-0 truncate', item.sent ? 'text-green-600' : 'text-gray-700')}>
                                  {item.title}
                                </span>
                                {item.assignee && <span className="text-[11px] text-gray-400 flex-shrink-0">{item.assignee}</span>}
                                {item.dueDate && <span className="text-[11px] text-gray-400 flex-shrink-0">{item.dueDate}</span>}
                                {item.sent ? (
                                  <span className="text-[10px] text-green-500 font-semibold flex-shrink-0">태스크에 추가됨 ✓</span>
                                ) : (
                                  onAddTask && item.title.trim() && (
                                    <button
                                      onClick={() => sendActionItemToBoard(note, item)}
                                      className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold flex-shrink-0"
                                    >
                                      태스크로 <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Edit actions */}
                    {isEditing && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={saveEdit}
                          className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 rounded-xl text-[12px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200"
                        >
                          취소
                        </button>
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
