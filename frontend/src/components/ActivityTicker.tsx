import { useEffect, useRef } from 'react'

export type ActivityEventType = 'task_created' | 'task_moved' | 'task_done' | 'task_deleted' | 'task_checklist'

export type ActivityEvent = {
  id: string
  type: ActivityEventType
  taskTitle: string
  fromCol?: string
  toCol?: string
  projectName?: string
  timestamp: number
}

interface ActivityTickerProps {
  events: ActivityEvent[]
}

const EVENT_CONFIG: Record<ActivityEventType, { emoji: string; color: string; label: (e: ActivityEvent) => string }> = {
  task_created: {
    emoji: '✨',
    color: '#ffd60a',
    label: (e) => `새 태스크 추가됨 · "${e.taskTitle}"${e.projectName ? ` (${e.projectName})` : ''}`,
  },
  task_moved: {
    emoji: '📌',
    color: '#64d2ff',
    label: (e) => `"${e.taskTitle}" · ${e.fromCol} → ${e.toCol}${e.projectName ? ` (${e.projectName})` : ''}`,
  },
  task_done: {
    emoji: '🎉',
    color: '#34c759',
    label: (e) => `완료! "${e.taskTitle}"${e.projectName ? ` (${e.projectName})` : ''} 🔥`,
  },
  task_deleted: {
    emoji: '🗑',
    color: '#ff453a',
    label: (e) => `"${e.taskTitle}" 삭제됨`,
  },
  task_checklist: {
    emoji: '☑️',
    color: '#af52de',
    label: (e) => `체크리스트 완료 · "${e.taskTitle}"`,
  },
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function ActivityTicker({ events }: ActivityTickerProps) {
  const tickerRef = useRef<HTMLDivElement>(null)

  // 새 이벤트 오면 ticker를 맨 오른쪽 끝에서 왼쪽으로 스크롤 재시작
  useEffect(() => {
    if (!tickerRef.current || events.length === 0) return
    // 새 이벤트가 들어오면 ticker를 reset해서 처음부터 흐르게 함
    const el = tickerRef.current
    el.style.animation = 'none'
    void el.offsetHeight // reflow trick
    el.style.animation = ''
  }, [events.length])

  if (events.length === 0) return null

  // 최근 20개만 표시, 가장 최근 것이 앞에 오도록
  const displayEvents = [...events].reverse().slice(0, 20)

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 40s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
        style={{
          height: 36,
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* 왼쪽 라벨 */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-3 gap-1.5"
          style={{
            background: 'linear-gradient(90deg, rgba(10,10,10,1) 60%, transparent)',
            minWidth: 100,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#34c759', boxShadow: '0 0 6px #34c759' }}
          />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em' }}>
            LIVE
          </span>
        </div>

        {/* 흐르는 Ticker 트랙 */}
        <div className="flex items-center h-full" style={{ paddingLeft: 96 }}>
          <div ref={tickerRef} className="ticker-track flex items-center gap-8 whitespace-nowrap">
            {/* 두 번 반복해서 끊김 없는 loop 효과 */}
            {[...displayEvents, ...displayEvents].map((event, i) => {
              const cfg = EVENT_CONFIG[event.type]
              return (
                <span
                  key={`${event.id}-${i}`}
                  className="flex items-center gap-2"
                  style={{ fontSize: 12 }}
                >
                  <span>{cfg.emoji}</span>
                  <span style={{ color: cfg.color, fontWeight: 600 }}>
                    {cfg.label(event)}
                  </span>
                  <span style={{ color: '#3a3a3c', fontSize: 10, marginLeft: 4 }}>
                    {formatTime(event.timestamp)}
                  </span>
                  <span style={{ color: '#2c2c2e', marginLeft: 16 }}>·</span>
                </span>
              )
            })}
          </div>
        </div>

        {/* 오른쪽 fade */}
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none"
          style={{
            width: 80,
            background: 'linear-gradient(270deg, rgba(10,10,10,1) 40%, transparent)',
          }}
        />
      </div>
    </>
  )
}
