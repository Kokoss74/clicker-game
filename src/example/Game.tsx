import React, { useState, useEffect, useMemo } from 'react';
import { useTimer } from '../hooks/useTimer';
import { useSupabase } from '../hooks/useSupabase';
import { User } from '../types/user';
import { Attempt } from '../types/attempt';
import ModalRules from './ModalRules';
import { toast } from 'react-toastify';

interface GameProps {
  user: User
}

const Game: React.FC<GameProps> = ({ user }) => {
  const { time, milliseconds, startTimer, stopTimer, resetTimer } = useTimer()
  const { recordAttempt, getUserAttempts, getUser } = useSupabase()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [showRules, setShowRules] = useState(false)
  const [bestResultIndex, setBestResultIndex] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<User>(user)
  
  // Запускаем таймер при загрузке компонента
  useEffect(() => {
    startTimer()
    
    // Загружаем попытки пользователя при монтировании компонента
    const loadAttempts = async () => {
      const userAttempts = await getUserAttempts(user.id)
      setAttempts(userAttempts)
      
      // Обновляем данные пользователя
      const updatedUser = await getUser(user.id)
      if (updatedUser) {
        setCurrentUser(updatedUser)
      }
      
      // Если у пользователя закончились попытки, находим лучший результат
      if (updatedUser && updatedUser.attempts_left <= 0) {
        findBestResult(userAttempts)
      }
    }
    
    loadAttempts()
    
    // Очищаем интервал при размонтировании компонента
    return () => {
      stopTimer()
    }
  }, [user.id])
  
  // Находим индекс лучшего результата (минимальное отклонение)
  const findBestResult = (attemptsData: Attempt[]) => {
    if (attemptsData.length === 0) return
    
    let minDiff = Number.MAX_VALUE
    let minIndex = -1
    
    // Находим индекс лучшего результата в отображаемых попытках
    const displayedAttempts = attemptsData.slice(-10)
    displayedAttempts.forEach((attempt, index) => {
      if (attempt.difference < minDiff) {
        minDiff = attempt.difference
        minIndex = index
      }
    })
    
    if (minIndex !== -1) {
      setBestResultIndex(minIndex)
    }
  }

  // Ограничиваем отображение попыток до 10 последних
  const displayedAttempts = useMemo(() => {
    return attempts.slice(-10)
  }, [attempts])
  
  const handleAttempt = async () => {
    if (currentUser.attempts_left <= 0) {
      toast.error(`Для продолжения игры необходимо использовать имеющуюся скидку ${currentUser.discount}% в магазине.`);
      return;
    }

    stopTimer();

    // Вычисляем отклонение от целой секунды
    const diff: number = milliseconds < 500 ? milliseconds : 1000 - milliseconds;
    const success: boolean = await recordAttempt(user.id, diff);
    if (success) {
      const userAttempts = await getUserAttempts(user.id);
      setAttempts(userAttempts);

      // Обновляем данные пользователя
      const updatedUser = await getUser(user.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);

        // Проверяем, закончились ли попытки у пользователя
        if (updatedUser.attempts_left <= 0) {
          findBestResult(userAttempts);
        }
      }
    }
    resetTimer()
    startTimer()
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Игра Clicker</h1>
      <div className="timer text-4xl font-mono mb-4">{time}</div>
      <button
        onClick={handleAttempt}
        className="game-button mb-4"
      >
        Нажать
      </button>
      <div className="bg-black">
        <h2 className="text-xl font-bold">Попытки:</h2>
        <p>Осталось попыток: {currentUser.attempts_left}</p>
        {currentUser.best_result !== null && (
          <p>Лучший результат: {currentUser.best_result} мс (Скидка: {currentUser.discount}%)</p>
        )}
        <table className="table mt-2">
          <thead className="bg-black text-white">
            <tr>
              <th>#</th>
              <th>Отклонение (мс)</th>
            </tr>
          </thead>
          <tbody className="bg-black text-white">
            {displayedAttempts.map((attempt, index) => (
              <tr 
                key={index} 
                className={currentUser.attempts_left <= 0 && index === bestResultIndex ? "bg-lime-500" : ""}
              >
                <td>{index + 1}</td>
                <td>{attempt.difference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => setShowRules(true)} className="mt-4 btn btn-secondary">
        Правила игры
      </button>
      <ModalRules isOpen={showRules} onRequestClose={() => setShowRules(false)} />
    </div>
  )
}

export default Game
