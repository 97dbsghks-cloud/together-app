import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Settings, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { GanttConfig, GanttRow, GanttBar, GanttMilestone } from '../App'

const WEEK_W   = 34   // px per week column
const ROW_H    = 44   // px per row
const LEFT_W   = 224  // px for name column
const HDR_YEAR = 26
const HDR_MONTH = 26
const HDR_WEEK  = 22
const HDR_H = HDR_YEAR + HDR_MONTH + HDR_WEEK

const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const BAR_COLORS = ['#4a7fd4','#2db36f','#e8882a','#e04545','#6c5ce7','#a855f7','#22b8cf','#6b7280']
const MS_COLORS  = ['#ff3b30','#ff9f0a','#007aff','#34c759','#5856d6','#af52de','#3a3530','#6b7280']

// ── Types ─────────────────────────────────────────────────────────────────────
type Drag =
  | { mode: 'idle' }
  | { mode: 'creating'; rowId: string; anchor: number; cur: number }
  | { mode: 'moving';   rowId: string; barId: string; offset: number; cur: number }
  | { mode: 'resizing'; rowId: string; barId: string; side: 'L'|'R'; origS: number; origE: number; cur: number }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMonday(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function defaultGantt(): GanttConfig {
  const mon = getMonday(new Date())
  return { startDate: mon.toISOString().slice(0, 10), weekCount: 26, rows: [] }
}

function buildHeader(startDate: string, weekCount: number) {
  const base = new Date(startDate + 'T00:00:00')
  const weeks = Array.from({ length: weekCount }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i * 7)
    return { i, year: d.getFullYear(), mo: d.getMonth() }
  })
  const months: { year: number; mo: number; s: number; n: number }[] = []
  for (const w of weeks) {
    const p = months[months.length - 1]
    if (p && p.year === w.year && p.mo === w.mo) p.n++
    else months.push({ year: w.year, mo: w.mo, s: w.i, n: 1 })
  }
  const years: { year: number; s: number; n: number }[] = []
  for (const m of months) {
    const p = years[years.length - 1]
    if (p && p.year === m.year) p.n += m.n
    else years.push({ year: m.year, s: m.s, n: m.n })
  }
  return { weeks, months, years }
}

// ── Component ─────────────────────────────────────────────────────────────────
type Props = { gantt: GanttConfig | undefined; onChange: (g: GanttConfig) => void }

export default function MilestoneView({ gantt: prop, onChange }: Props) {
  const [g, setG] = useState<GanttConfig>(() => prop ?? defaultGantt())

  // Sync prop → local whenever prop changes (project switch or first load)
  // Do NOT call onChange here — that would overwrite server data with a default
  useEffect(() => { setG(prop ?? defaultGantt()) }, [prop])

  // Current week index relative to gantt startDate
  const todayWeekIdx = (() => {
    const base = new Date(g.startDate + 'T00:00:00')
    const today = getMonday(new Date())
    const diff = Math.round((today.getTime() - base.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return diff
  })()

  // Always-current refs for event handlers
  const gRef  = useRef(g);        gRef.current  = g
  const cbRef = useRef(onChange); cbRef.current = onChange

  const commit = useCallback((next: GanttConfig) => {
    setG(next)
    cbRef.current(next)
  }, [])

  const commitRef = useRef(commit); commitRef.current = commit

  // ── Scroll container ref ───────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Drag state ─────────────────────────────────────────────────────────────
  const dragRef  = useRef<Drag>({ mode: 'idle' })
  const [drag, setDrag] = useState<Drag>({ mode: 'idle' })
  const movedRef = useRef(false)  // true if mouse actually moved during drag

  const wkFromClientX = useCallback((clientX: number) => {
    const el = scrollRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left + el.scrollLeft - LEFT_W
    return Math.max(0, Math.min(gRef.current.weekCount - 1, Math.floor(x / WEEK_W)))
  }, [])

  // Global mouse handlers – registered once
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (d.mode === 'idle') return
      movedRef.current = true
      const el = scrollRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left + el.scrollLeft - LEFT_W
      const wk = Math.max(0, Math.min(gRef.current.weekCount - 1, Math.floor(x / WEEK_W)))
      const next = { ...d, cur: wk } as Drag
      dragRef.current = next
      setDrag({ ...next })
    }

    const onUp = () => {
      const d   = dragRef.current
      const cur = gRef.current
      const upd = commitRef.current

      if (d.mode !== 'idle' && movedRef.current) {
        if (d.mode === 'creating') {
          const s = Math.min(d.anchor, d.cur)
          const e = Math.max(d.anchor, d.cur)
          const bar: GanttBar = { id: uuidv4(), startWeek: s, endWeek: e, color: BAR_COLORS[0] }
          upd({ ...cur, rows: cur.rows.map(r => r.id === d.rowId ? { ...r, bars: [...r.bars, bar] } : r) })

        } else if (d.mode === 'moving') {
          const row = cur.rows.find(r => r.id === d.rowId)
          const bar = row?.bars.find(b => b.id === d.barId)
          if (bar) {
            const len = bar.endWeek - bar.startWeek
            const s = Math.max(0, d.cur - d.offset)
            const e = Math.min(cur.weekCount - 1, s + len)
            upd({ ...cur, rows: cur.rows.map(r => r.id === d.rowId
              ? { ...r, bars: r.bars.map(b => b.id === d.barId ? { ...b, startWeek: s, endWeek: e } : b) }
              : r) })
          }

        } else if (d.mode === 'resizing') {
          const s2 = d.side === 'L' ? Math.min(d.cur, d.origE) : d.origS
          const e2 = d.side === 'R' ? Math.max(d.cur, d.origS) : d.origE
          upd({ ...cur, rows: cur.rows.map(r => r.id === d.rowId
            ? { ...r, bars: r.bars.map(b => b.id === d.barId ? { ...b, startWeek: s2, endWeek: e2 } : b) }
            : r) })
        }
      }

      dragRef.current  = { mode: 'idle' }
      movedRef.current = false
      setDrag({ mode: 'idle' })
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ── Drag visual helpers ────────────────────────────────────────────────────
  const barPos = (rId: string, bar: GanttBar) => {
    const d = drag
    if (d.mode === 'moving' && d.rowId === rId && d.barId === bar.id) {
      const len = bar.endWeek - bar.startWeek
      const s = Math.max(0, d.cur - d.offset)
      return { s, e: Math.min(g.weekCount - 1, s + len) }
    }
    if (d.mode === 'resizing' && d.rowId === rId && d.barId === bar.id) {
      return {
        s: d.side === 'L' ? Math.min(d.cur, d.origE) : d.origS,
        e: d.side === 'R' ? Math.max(d.cur, d.origS) : d.origE,
      }
    }
    return { s: bar.startWeek, e: bar.endWeek }
  }

  const creatingPreview = (rId: string) => {
    const d = drag
    if (d.mode !== 'creating' || d.rowId !== rId) return null
    return { s: Math.min(d.anchor, d.cur), e: Math.max(d.anchor, d.cur) }
  }

  // ── Modal state ────────────────────────────────────────────────────────────
  const [editBar,    setEditBar]    = useState<{ rId: string; bId: string } | null>(null)
  const [editMs,     setEditMs]     = useState<{ rId: string; mId: string } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settDate,   setSettDate]   = useState(g.startDate)
  const [settWeeks,  setSettWeeks]  = useState(g.weekCount)
  const [showAddRow, setShowAddRow] = useState(false)
  const [rowName,    setRowName]    = useState('')
  const [rowGroup,   setRowGroup]   = useState(false)
  const [rowIndent,  setRowIndent]  = useState(0)
  const [editRowId,  setEditRowId]  = useState<string | null>(null)
  const [editRowName,setEditRowName]= useState('')

  const header = buildHeader(g.startDate, g.weekCount)
  const totalW = g.weekCount * WEEK_W

  // ── Helpers ────────────────────────────────────────────────────────────────
  const doAddRow = () => {
    if (!rowName.trim()) return
    const row: GanttRow = { id: uuidv4(), name: rowName.trim(), indent: rowIndent, isGroup: rowGroup, bars: [], milestones: [] }
    commit({ ...g, rows: [...g.rows, row] })
    setShowAddRow(false); setRowName(''); setRowGroup(false); setRowIndent(0)
  }

  const saveRowName = () => {
    if (editRowName.trim())
      commit({ ...g, rows: g.rows.map(r => r.id === editRowId ? { ...r, name: editRowName.trim() } : r) })
    setEditRowId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 t-surface overflow-hidden">

      {/* Toolbar — h-[56px] matches sub-tab bar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 border-b t-border t-surface" style={{ height: 56 }}>
        <button
          onClick={() => { setSettDate(g.startDate); setSettWeeks(g.weekCount); setShowSettings(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold t-text2 border t-border rounded-lg t-hover transition-colors"
        >
          <Settings className="w-3.5 h-3.5" /> 설정
        </button>
        <button
          onClick={() => { setRowName(''); setRowGroup(false); setRowIndent(0); setShowAddRow(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
          style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
        >
          <Plus className="w-3.5 h-3.5" /> 행 추가
        </button>
        <p className="text-[11px] t-text3 ml-1 hidden lg:block">
          드래그 → 바 생성 &nbsp;|&nbsp; 더블클릭 → 마일스톤 추가 &nbsp;|&nbsp; 바 클릭 → 편집 &nbsp;|&nbsp; 공정명 더블클릭 → 이름 수정
        </p>
      </div>

      {/* ── Gantt Table ────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto select-none"
        style={{ cursor: drag.mode !== 'idle' ? 'grabbing' : 'default' }}
      >
        <div style={{ minWidth: LEFT_W + totalW, minHeight: '100%' }}>

          {/* Sticky header */}
          <div className="sticky top-0 z-20 flex" style={{ height: HDR_H }}>
            {/* Corner cell */}
            <div
              className="sticky left-0 z-30 flex-shrink-0 flex items-end pb-2 px-3 border-b border-r"
              style={{ width: LEFT_W, height: HDR_H, background: 'var(--t-surface2)', borderColor: 'var(--t-border)' }}
            >
              <span className="text-[10px] font-bold t-text3 uppercase tracking-widest">공정명</span>
            </div>

            {/* Year / Month / Week */}
            <div className="relative flex-shrink-0 border-b t-border" style={{ width: totalW, height: HDR_H }}>
              {/* Year row */}
              {header.years.map(y => (
                <div
                  key={y.year}
                  className="absolute flex items-center justify-center text-[11px] font-bold text-white border-r"
                  style={{ left: y.s * WEEK_W, width: y.n * WEEK_W, top: 0, height: HDR_YEAR, background: 'var(--t-accent)', borderColor: 'var(--t-border)', opacity: 0.85 }}
                >
                  '{String(y.year).slice(2)}
                </div>
              ))}
              {/* Month row */}
              {header.months.map((m, i) => (
                <div
                  key={i}
                  className="absolute flex items-center justify-center text-[10px] font-semibold t-text2 border-r t-border"
                  style={{ left: m.s * WEEK_W, width: m.n * WEEK_W, top: HDR_YEAR, height: HDR_MONTH, background: 'var(--t-surface2)' }}
                >
                  {MONTH_KO[m.mo]}
                </div>
              ))}
              {/* Week index row */}
              {header.weeks.map(w => (
                <div
                  key={w.i}
                  className="absolute flex items-center justify-center text-[9px] border-r t-border"
                  style={{
                    left: w.i * WEEK_W, width: WEEK_W, top: HDR_YEAR + HDR_MONTH, height: HDR_WEEK,
                    background: w.i === todayWeekIdx ? 'rgba(99,102,241,0.15)' : 'var(--t-surface)',
                    color: w.i === todayWeekIdx ? 'var(--t-accent2)' : 'var(--t-text3)',
                    fontWeight: w.i === todayWeekIdx ? 700 : 400,
                  }}
                >
                  {w.i + 1}
                </div>
              ))}
              {/* Today vertical line in header */}
              {todayWeekIdx >= 0 && todayWeekIdx < g.weekCount && (
                <div
                  className="absolute pointer-events-none z-10"
                  style={{ left: todayWeekIdx * WEEK_W + WEEK_W / 2, width: 2, top: 0, bottom: 0, background: 'rgba(0,122,255,0.7)' }}
                />
              )}
            </div>
          </div>

          {/* Data rows */}
          {g.rows.map((row, ri) => (
            <div key={row.id} className="flex group/row" style={{ height: ROW_H }}>

              {/* Name cell */}
              <div
                className="sticky left-0 z-10 flex-shrink-0 flex items-center gap-0.5 border-b border-r t-border"
                style={{ width: LEFT_W, paddingLeft: 8 + row.indent * 16, background: row.isGroup ? 'var(--t-surface2)' : 'var(--t-surface)' }}
              >
                {editRowId === row.id ? (
                  <input
                    autoFocus
                    value={editRowName}
                    onChange={e => setEditRowName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveRowName()
                      if (e.key === 'Escape') setEditRowId(null)
                    }}
                    onBlur={saveRowName}
                    className="flex-1 min-w-0 text-xs border-b border-blue-400 bg-transparent outline-none py-0.5"
                  />
                ) : (
                  <button
                    className="flex-1 min-w-0 text-left truncate"
                    onDoubleClick={() => { setEditRowId(row.id); setEditRowName(row.name) }}
                    title="더블클릭으로 이름 수정"
                  >
                    {row.indent > 0 && <span className="t-text3 mr-0.5 text-[11px]">-</span>}
                    <span className={`text-[12px] ${row.isGroup ? 'font-bold t-text' : 'font-medium t-text2'}`}>
                      {row.name}
                    </span>
                  </button>
                )}

                {/* Row controls (visible on hover) */}
                <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                  {ri > 0 && (
                    <button
                      onClick={() => commit({ ...g, rows: [...g.rows.slice(0, ri-1), g.rows[ri], g.rows[ri-1], ...g.rows.slice(ri+1)] })}
                      className="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  )}
                  {ri < g.rows.length - 1 && (
                    <button
                      onClick={() => commit({ ...g, rows: [...g.rows.slice(0, ri), g.rows[ri+1], g.rows[ri], ...g.rows.slice(ri+2)] })}
                      className="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => commit({ ...g, rows: g.rows.filter(r => r.id !== row.id) })}
                    className="p-0.5 rounded text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Timeline cell */}
              <div
                className="relative flex-shrink-0 border-b t-border"
                style={{ width: totalW, height: ROW_H, background: row.isGroup ? 'var(--t-surface2)' : 'var(--t-surface)' }}
                onMouseDown={e => {
                  if (row.isGroup || e.button !== 0) return
                  const wk = wkFromClientX(e.clientX)
                  const ds: Drag = { mode: 'creating', rowId: row.id, anchor: wk, cur: wk }
                  movedRef.current = false
                  dragRef.current = ds; setDrag(ds)
                  e.preventDefault()
                }}
                onDoubleClick={e => {
                  if (row.isGroup) return
                  const wk = wkFromClientX(e.clientX)
                  const ms: GanttMilestone = { id: uuidv4(), week: wk, label: '마일스톤', color: '#ff3b30' }
                  commit({ ...g, rows: g.rows.map(r => r.id === row.id ? { ...r, milestones: [...r.milestones, ms] } : r) })
                }}
              >
                {/* Month grid lines */}
                {header.months.map((m, i) => (
                  <div key={i} className="absolute inset-y-0 border-l border-gray-100" style={{ left: m.s * WEEK_W }} />
                ))}
                {/* Today line */}
                {todayWeekIdx >= 0 && todayWeekIdx < g.weekCount && (
                  <div
                    className="absolute inset-y-0 pointer-events-none z-10"
                    style={{ left: todayWeekIdx * WEEK_W + WEEK_W / 2, width: 2, background: 'rgba(0,122,255,0.7)' }}
                  />
                )}

                {/* Gantt bars */}
                {row.bars.map(bar => {
                  const { s, e } = barPos(row.id, bar)
                  const color = bar.color ?? BAR_COLORS[0]
                  return (
                    <div
                      key={bar.id}
                      className="absolute flex items-center rounded text-white text-[10px] font-semibold overflow-hidden"
                      style={{
                        left: s * WEEK_W + 1, width: (e - s + 1) * WEEK_W - 2,
                        top: (ROW_H - 24) / 2, height: 24,
                        background: color,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                        cursor: drag.mode !== 'idle' ? 'grabbing' : 'grab',
                        userSelect: 'none',
                      }}
                      onMouseDown={e => {
                        e.stopPropagation(); if (e.button !== 0) return
                        const wk = wkFromClientX(e.clientX)
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        const rx = e.clientX - rect.left
                        const bw = rect.width
                        let ds: Drag
                        if (rx < 7)
                          ds = { mode: 'resizing', rowId: row.id, barId: bar.id, side: 'L', origS: bar.startWeek, origE: bar.endWeek, cur: wk }
                        else if (rx > bw - 7)
                          ds = { mode: 'resizing', rowId: row.id, barId: bar.id, side: 'R', origS: bar.startWeek, origE: bar.endWeek, cur: wk }
                        else
                          ds = { mode: 'moving', rowId: row.id, barId: bar.id, offset: wk - bar.startWeek, cur: wk }
                        movedRef.current = false
                        dragRef.current = ds; setDrag(ds)
                        e.preventDefault()
                      }}
                      onClick={e => {
                        e.stopPropagation()
                        if (!movedRef.current) setEditBar({ rId: row.id, bId: bar.id })
                      }}
                    >
                      {/* Left resize handle */}
                      <div className="absolute left-0 inset-y-0 w-2 cursor-w-resize flex-shrink-0" />
                      <span className="flex-1 truncate px-2 pointer-events-none">{bar.label}</span>
                      {/* Right resize handle */}
                      <div className="absolute right-0 inset-y-0 w-2 cursor-e-resize flex-shrink-0" />
                    </div>
                  )
                })}

                {/* Creating preview */}
                {(() => {
                  const p = creatingPreview(row.id)
                  if (!p) return null
                  return (
                    <div
                      className="absolute rounded pointer-events-none"
                      style={{
                        left: p.s * WEEK_W + 1, width: (p.e - p.s + 1) * WEEK_W - 2,
                        top: (ROW_H - 24) / 2, height: 24,
                        background: BAR_COLORS[0], opacity: 0.4,
                      }}
                    />
                  )
                })()}

                {/* Milestones (◆ diamond) */}
                {row.milestones.map(ms => (
                  <div
                    key={ms.id}
                    className="absolute flex flex-col items-center cursor-pointer"
                    style={{ left: ms.week * WEEK_W + WEEK_W / 2 - 7, top: 3, zIndex: 5 }}
                    onClick={e => { e.stopPropagation(); setEditMs({ rId: row.id, mId: ms.id }) }}
                  >
                    <div
                      className="w-3.5 h-3.5 rotate-45 flex-shrink-0"
                      style={{ background: ms.color ?? '#ff3b30', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
                    />
                    <span className="text-[8px] font-bold mt-0.5 whitespace-nowrap leading-none" style={{ color: ms.color ?? '#ff3b30' }}>
                      {ms.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {g.rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(0,122,255,0.08)' }}>
                <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="5" width="16" height="3" rx="1.5" />
                  <rect x="6" y="11" width="12" height="3" rx="1.5" />
                  <rect x="4" y="17" width="10" height="3" rx="1.5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-400">공정이 없습니다</p>
              <p className="text-xs text-gray-300 mt-1">"행 추가"로 공정을 등록한 뒤 드래그하여 일정을 입력하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bar Edit Modal ─────────────────────────────────────────────────── */}
      {editBar && (() => {
        const row = g.rows.find(r => r.id === editBar.rId)
        const bar = row?.bars.find(b => b.id === editBar.bId)
        if (!bar) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setEditBar(null)}>
            <div className="t-surface rounded-2xl p-4 w-64 space-y-3" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold t-text2 uppercase tracking-wider">바 편집</span>
                <button onClick={() => setEditBar(null)} className="t-text3 t-hover rounded p-0.5"><X className="w-4 h-4" /></button>
              </div>
              <div>
                <label className="text-[10px] font-semibold t-text3 uppercase tracking-wider block mb-1">레이블</label>
                <input
                  value={bar.label ?? ''}
                  onChange={e => commit({ ...g, rows: g.rows.map(r => r.id === editBar.rId
                    ? { ...r, bars: r.bars.map(b => b.id === editBar.bId ? { ...b, label: e.target.value } : b) }
                    : r) })}
                  placeholder="레이블 (선택)"
                  className="w-full px-3 py-1.5 text-xs border t-border t-surface2 t-text rounded-xl outline-none focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold t-text3 uppercase tracking-wider block mb-1.5">색상</label>
                <div className="flex gap-1.5 flex-wrap">
                  {BAR_COLORS.map(c => (
                    <button key={c}
                      onClick={() => commit({ ...g, rows: g.rows.map(r => r.id === editBar.rId
                        ? { ...r, bars: r.bars.map(b => b.id === editBar.bId ? { ...b, color: c } : b) }
                        : r) })}
                      className="w-5 h-5 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: bar.color === c ? 'var(--t-text)' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  commit({ ...g, rows: g.rows.map(r => r.id === editBar.rId
                    ? { ...r, bars: r.bars.filter(b => b.id !== editBar.bId) }
                    : r) })
                  setEditBar(null)
                }}
                className="w-full py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Milestone Edit Modal ───────────────────────────────────────────── */}
      {editMs && (() => {
        const row = g.rows.find(r => r.id === editMs.rId)
        const ms  = row?.milestones.find(m => m.id === editMs.mId)
        if (!ms) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setEditMs(null)}>
            <div className="t-surface rounded-2xl p-4 w-56 space-y-3" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold t-text2 uppercase tracking-wider">마일스톤 편집</span>
                <button onClick={() => setEditMs(null)} className="t-text3 t-hover rounded p-0.5"><X className="w-4 h-4" /></button>
              </div>
              <div>
                <label className="text-[10px] font-semibold t-text3 uppercase tracking-wider block mb-1">레이블</label>
                <input
                  value={ms.label}
                  onChange={e => commit({ ...g, rows: g.rows.map(r => r.id === editMs.rId
                    ? { ...r, milestones: r.milestones.map(m => m.id === editMs.mId ? { ...m, label: e.target.value } : m) }
                    : r) })}
                  className="w-full px-3 py-1.5 text-xs border t-border t-surface2 t-text rounded-xl outline-none focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold t-text3 uppercase tracking-wider block mb-1.5">색상</label>
                <div className="flex gap-1.5 flex-wrap">
                  {MS_COLORS.map(c => (
                    <button key={c}
                      onClick={() => commit({ ...g, rows: g.rows.map(r => r.id === editMs.rId
                        ? { ...r, milestones: r.milestones.map(m => m.id === editMs.mId ? { ...m, color: c } : m) }
                        : r) })}
                      className="w-5 h-5 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: ms.color === c ? 'var(--t-text)' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  commit({ ...g, rows: g.rows.map(r => r.id === editMs.rId
                    ? { ...r, milestones: r.milestones.filter(m => m.id !== editMs.mId) }
                    : r) })
                  setEditMs(null)
                }}
                className="w-full py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Add Row Modal ──────────────────────────────────────────────────── */}
      {showAddRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAddRow(false)}>
          <div className="t-surface rounded-2xl p-5 w-72 space-y-3" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold t-text">행 추가</span>
              <button onClick={() => setShowAddRow(false)} className="t-text3 t-hover rounded p-0.5"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-[10px] font-semibold t-text3 uppercase tracking-wider block mb-1">공정명</label>
              <input
                autoFocus value={rowName} onChange={e => setRowName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doAddRow()}
                placeholder="예: 토공사, 굴착공사, 마감공사"
                className="w-full px-3 py-2 text-sm border t-border t-surface2 t-text rounded-xl outline-none focus:border-blue-400 transition-all"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={rowGroup} onChange={e => setRowGroup(e.target.checked)} className="rounded" />
              <span className="text-xs font-medium t-text2">그룹 헤더 (굵게 + 배경색)</span>
            </label>
            <div>
              <label className="text-[10px] font-semibold t-text3 uppercase tracking-wider block mb-1.5">들여쓰기</label>
              <div className="flex gap-1.5">
                {(['없음', '1단', '2단'] as const).map((label, n) => (
                  <button key={n} onClick={() => setRowIndent(n)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${rowIndent === n ? 'text-white' : 't-surface2 t-text2 t-hover'}`}
                    style={rowIndent === n ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={doAddRow} disabled={!rowName.trim()}
              className="w-full py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              추가
            </button>
          </div>
        </div>
      )}

      {/* ── Settings Modal ─────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setShowSettings(false)}>
          <div className="t-surface rounded-2xl p-5 w-72 space-y-3" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold t-text">간트 설정</span>
              <button onClick={() => setShowSettings(false)} className="t-text3 t-hover rounded p-0.5"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-[10px] font-semibold t-text3 uppercase tracking-wider block mb-1">시작일</label>
              <input
                type="date" value={settDate} onChange={e => setSettDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border t-border t-surface2 t-text rounded-xl outline-none focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold t-text3 uppercase tracking-wider block mb-1">
                표시 기간 (주 단위, 4 ~ 104주)
              </label>
              <input
                type="number" min={4} max={104} value={settWeeks}
                onChange={e => setSettWeeks(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border t-border t-surface2 t-text rounded-xl outline-none focus:border-blue-400 transition-all"
              />
            </div>
            <button
              onClick={() => {
                commit({ ...g, startDate: settDate, weekCount: Math.max(4, Math.min(104, settWeeks)) })
                setShowSettings(false)
              }}
              className="w-full py-2 text-sm font-semibold text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
