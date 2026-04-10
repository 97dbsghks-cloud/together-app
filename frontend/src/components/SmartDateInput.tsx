import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

type Props = {
  value: string   // YYYY-MM-DD
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

export default function SmartDateInput({ value, onChange, className }: Props) {
  const parts = value ? value.split('-') : []
  const [y, setY] = useState(parts[0] ?? '')
  const [m, setM] = useState(parts[1] ?? '')
  const [d, setD] = useState(parts[2] ?? '')

  const monthRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)

  // Sync when parent changes value externally
  useEffect(() => {
    const p = value ? value.split('-') : []
    setY(p[0] ?? '')
    setM(p[1] ?? '')
    setD(p[2] ?? '')
  }, [value])

  const emit = (ny: string, nm: string, nd: string) => {
    if (!ny && !nm && !nd) { onChange(''); return }
    onChange(`${ny}-${nm}-${nd}`)
  }

  return (
    <div className={clsx('flex items-center border border-gray-200 rounded-lg focus-within:border-blue-400 bg-white px-2 py-1.5', className)}>
      <input
        type="text"
        inputMode="numeric"
        value={y}
        maxLength={4}
        placeholder="YYYY"
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 4)
          setY(v)
          emit(v, m, d)
          if (v.length === 4) { monthRef.current?.focus(); monthRef.current?.select() }
        }}
        className="w-10 text-center text-[12px] outline-none bg-transparent placeholder-gray-300"
      />
      <span className="text-gray-300 text-[12px] mx-0.5 select-none">.</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        value={m}
        maxLength={2}
        placeholder="MM"
        onKeyDown={e => {
          if (e.key === 'Backspace' && m === '') {
            e.preventDefault()
            // focus year on backspace when empty
            ;(e.currentTarget.previousElementSibling?.previousElementSibling as HTMLInputElement)?.focus()
          }
        }}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 2)
          setM(v)
          emit(y, v, d)
          if (v.length === 2) { dayRef.current?.focus(); dayRef.current?.select() }
        }}
        className="w-6 text-center text-[12px] outline-none bg-transparent placeholder-gray-300"
      />
      <span className="text-gray-300 text-[12px] mx-0.5 select-none">.</span>
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        value={d}
        maxLength={2}
        placeholder="DD"
        onKeyDown={e => {
          if (e.key === 'Backspace' && d === '') {
            e.preventDefault()
            monthRef.current?.focus()
          }
        }}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 2)
          setD(v)
          emit(y, m, v)
        }}
        className="w-6 text-center text-[12px] outline-none bg-transparent placeholder-gray-300"
      />
    </div>
  )
}
