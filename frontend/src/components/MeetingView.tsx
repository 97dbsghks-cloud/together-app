import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, BookOpen, ArrowRight } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import clsx from 'clsx'
import type { Task, RememberItem } from '../App'

export type MeetingNote = {
  id: string
  date: string
  attendees: string
  agenda: string
  decisions: string
  actionItems: MeetingActionItem[]
}

export type MeetingActionItem = {
  id: string
  title: string
  assignee: string
  dueDate: string
  sent?: boolean
}

type Props = {
  meetings: MeetingNote[]
  columns: { id: string; title: string; color: string }[]
  onChange: (meetings: MeetingNote[]) => void
  onSendToRemember?: (item: RememberItem) => void
  onAddTask?: (colId: string, task: Partial<Task>) => void
  isAdmin: boolean
}

const EMPTY_NOTE = (): MeetingNote => ({
  id: uuidv4(),
  date: new Date().toISOString().slice(0, 10),
  attendees: '',
  agenda: '',
  decisions: '',
  actionItems: [],
})

export default function MeetingView({ meetings, columns, onChange, onSendToRemember, onAddTask, isAdmin }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(meetings[0]?.id ?? null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<MeetingNote | null>(null)

  const startEdit = (note: MeetingNote) => {
    setEditingId(note.id)
    setDraft({ ...note, actionItems: note.actionItems.map(a => ({ ...a })) })
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
    const note = EMPTY_NOTE()
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

  const addActionItem = () => {
    if (!draft) return
    const item: MeetingActionItem = { id: uuidv4(), title: '', assignee: '', dueDate: '' }
    setDraft({ ...draft, actionItems: [...draft.actionItems, item] })
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

  const sendDecisionToRemember = (note: MeetingNote) => {
    if (!onSendToRemember || !note.decisions.trim()) return
    onSendToRemember({
      id: uuidv4(),
      content: `[회의록 ${note.date}] ${note.decisions}`,
      stage: '기타',
      assignee: '',
      deadline: '',
      importance: 2,
      done: false,
    })
  }

  const sendActionItemToBoard = (note: MeetingNote, item: MeetingActionItem, colId: string) => {
    if (!onAddTask || !item.title.trim()) return
    onAddTask(colId, {
      title: item.title,
      assignee: item.assignee || undefined,
      dueDate: item.dueDate || undefined,
    })
    // mark sent
    onChange(meetings.map(m => m.id === note.id
      ? { ...m, actionItems: m.actionItems.map(a => a.id === item.id ? { ...a, sent: true } : a) }
      : m
    ))
  }

  const firstTodoCol = columns.find(c => c.id === 'todo') ?? columns[0]

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h2 className="text-[14px] font-bold text-gray-800">회의록</h2>
            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{meetings.length}개</span>
          </div>
          {isAdmin && (
            <button
              onClick={addNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
            >
              <Plus className="w-3.5 h-3.5" /> 새 회의록
            </button>
          )}
        </div>

        {meetings.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-[13px]">아직 회의록이 없습니다.</p>
          </div>
        )}

        <div className="space-y-3">
          {meetings.map(note => {
            const isExpanded = expandedId === note.id
            const isEditing = editingId === note.id
            const d = isEditing ? draft! : note

            return (
              <div
                key={note.id}
                className="bg-white rounded-2xl border overflow-hidden transition-all"
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
                      {d.attendees && (
                        <span className="text-[11px] text-gray-400 truncate max-w-[200px]">참석: {d.attendees}</span>
                      )}
                      {d.agenda && (
                        <span className="text-[11px] text-blue-500 font-medium truncate max-w-[200px]">{d.agenda}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {isAdmin && !isEditing && (
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors text-[11px] font-semibold"
                      >
                        편집
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50 space-y-4 pt-3">
                    {/* Date & Attendees */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">날짜</label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={d.date}
                            onChange={e => setDraft(prev => prev ? { ...prev, date: e.target.value } : prev)}
                            className="w-full text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
                          />
                        ) : (
                          <p className="text-[12px] text-gray-700">{d.date}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">참석자</label>
                        {isEditing ? (
                          <input
                            value={d.attendees}
                            onChange={e => setDraft(prev => prev ? { ...prev, attendees: e.target.value } : prev)}
                            placeholder="홍길동, 김철수..."
                            className="w-full text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
                          />
                        ) : (
                          <p className="text-[12px] text-gray-700">{d.attendees || <span className="text-gray-300">-</span>}</p>
                        )}
                      </div>
                    </div>

                    {/* Agenda */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">안건</label>
                      {isEditing ? (
                        <input
                          value={d.agenda}
                          onChange={e => setDraft(prev => prev ? { ...prev, agenda: e.target.value } : prev)}
                          placeholder="회의 안건을 입력하세요..."
                          className="w-full text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
                        />
                      ) : (
                        <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{d.agenda || <span className="text-gray-300">-</span>}</p>
                      )}
                    </div>

                    {/* Decisions */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">결정사항</label>
                        {!isEditing && d.decisions.trim() && onSendToRemember && (
                          <button
                            onClick={() => sendDecisionToRemember(note)}
                            className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold"
                          >
                            리멤버로 <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          value={d.decisions}
                          onChange={e => setDraft(prev => prev ? { ...prev, decisions: e.target.value } : prev)}
                          placeholder="결정된 사항을 입력하세요..."
                          rows={3}
                          className="w-full text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 resize-none"
                        />
                      ) : (
                        <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{d.decisions || <span className="text-gray-300">-</span>}</p>
                      )}
                    </div>

                    {/* Action Items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">액션아이템</label>
                        {isEditing && (
                          <button onClick={addActionItem} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                            <Plus className="w-3 h-3" /> 추가
                          </button>
                        )}
                      </div>

                      {(isEditing ? d.actionItems : note.actionItems).length === 0 && !isEditing && (
                        <p className="text-[12px] text-gray-300">-</p>
                      )}

                      <div className="space-y-2">
                        {(isEditing ? d.actionItems : note.actionItems).map((item, idx) => (
                          <div
                            key={item.id}
                            className={clsx(
                              'flex items-center gap-2 p-2 rounded-xl',
                              item.sent ? 'bg-green-50' : 'bg-gray-50'
                            )}
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
                                <span className={clsx('flex-1 text-[12px] min-w-0 truncate', item.sent ? 'text-green-600 line-through' : 'text-gray-700')}>
                                  {item.title}
                                </span>
                                {item.assignee && (
                                  <span className="text-[11px] text-gray-400 flex-shrink-0">{item.assignee}</span>
                                )}
                                {item.dueDate && (
                                  <span className="text-[11px] text-gray-400 flex-shrink-0">{item.dueDate}</span>
                                )}
                                {onAddTask && !item.sent && item.title.trim() && firstTodoCol && (
                                  <button
                                    onClick={() => sendActionItemToBoard(note, item, firstTodoCol.id)}
                                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold flex-shrink-0"
                                  >
                                    보드로 <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                                {item.sent && (
                                  <span className="text-[10px] text-green-500 font-semibold flex-shrink-0">보드 추가됨</span>
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
