import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiEffectProps {
  trigger: boolean
}

export default function ConfettiEffect({ trigger }: ConfettiEffectProps) {
  useEffect(() => {
    if (!trigger) return

    // 왼쪽에서 burst
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { x: 0.3, y: 0.6 },
      colors: ['#007aff', '#34c759', '#ff9f0a', '#af52de', '#ff2d55'],
      scalar: 1.1,
      ticks: 200,
    })

    // 오른쪽에서 burst (50ms 딜레이)
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x: 0.7, y: 0.6 },
        colors: ['#5856d6', '#30d158', '#ffd60a', '#ff6b35', '#64d2ff'],
        scalar: 1.1,
        ticks: 200,
      })
    }, 100)

    // 중앙에서 작은 burst
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 80,
        startVelocity: 25,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#ffffff', '#007aff', '#34c759'],
        scalar: 0.9,
        ticks: 150,
      })
    }, 200)
  }, [trigger])

  return null
}
