import { useState, useEffect, useRef } from 'react'

interface UseTimerReturn {
  time: string
  milliseconds: number
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
}

export const useTimer = (): UseTimerReturn => {
  const [time, setTime] = useState<string>('00:00:00:000')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [milliseconds, setMilliseconds] = useState<number>(0)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        const now = new Date()
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        const ms = String(now.getMilliseconds()).padStart(3, '0')
        
        setTime(`${hours}:${minutes}:${seconds}:${ms}`)
        setMilliseconds(now.getMilliseconds())
      }, 10) // Обновляем каждые 10мс для более точного отображения
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const startTimer = () => {
    setIsRunning(true)
  }

  const stopTimer = () => {
    setIsRunning(false)
  }

  const resetTimer = () => {
    setTime('00:00:00:000')
    setMilliseconds(0)
  }

  return { time, milliseconds, startTimer, stopTimer, resetTimer }
}