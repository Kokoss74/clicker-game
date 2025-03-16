import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useTimer } from "../hooks/useTimer";
import { useSupabase } from "../hooks/useSupabase";
import { useAuthStore } from "../store/auth";
import ModalRules from "./ModalRules";
import { Database } from "../lib/database.types";
import { formatDiscount } from "../utils/formatUtils";

type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

const Game: React.FC = () => {
  const { user } = useAuthStore();
  const { time, milliseconds, startTimer, stopTimer, resetTimer } = useTimer();
  const { recordAttempt, getUserAttempts, getUser } = useSupabase();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [bestResultIndex, setBestResultIndex] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  // Запускаем таймер при загрузке компонента
  useEffect(() => {
    if (!user) return;

    startTimer();

    // Загружаем попытки пользователя при монтировании компонента
    const loadAttempts = async () => {
      const userAttempts = await getUserAttempts(user.id);
      setAttempts(userAttempts);

      // Обновляем данные пользователя
      const updatedUser = await getUser(user.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }

      // Если у пользователя закончились попытки, находим лучший результат
      if (updatedUser && updatedUser.attempts_left <= 0) {
        findBestResult(userAttempts);
      }
    };

    loadAttempts();

    // Очищаем интервал при размонтировании компонента
    return () => {
      stopTimer();
    };
  }, [user?.id]);

  // Находим индекс лучшего результата (минимальное отклонение)
  const findBestResult = (attemptsData: Attempt[]) => {
    if (attemptsData.length === 0) return;

    let minDiff = Number.MAX_VALUE;
    let minIndex = -1;

    // Находим индекс лучшего результата в отображаемых попытках
    const displayedAttempts = attemptsData.slice(-10);
    displayedAttempts.forEach((attempt, index) => {
      if (attempt.difference < minDiff) {
        minDiff = attempt.difference;
        minIndex = index;
      }
    });

    if (minIndex !== -1) {
      setBestResultIndex(minIndex);
    }
  };

  // Ограничиваем отображение попыток до 10 последних
  const displayedAttempts = useMemo(() => {
    return attempts.slice(-10);
  }, [attempts]);

  const handleAttempt = async () => {
    if (!user || !currentUser) return;

    if (currentUser.attempts_left <= 0 || isButtonDisabled) {
      toast.error(
        `Для продолжения игры необходимо использовать имеющуюся скидку ${currentUser.discount}% в магазине.`
      );
      return;
    }

    setIsButtonDisabled(true);
    setTimeout(() => setIsButtonDisabled(false), 2000); // Блокируем кнопку на 2 секунды для защиты от автокликеров

    stopTimer();

    // Вычисляем отклонение от целой секунды
    const diff: number =
      milliseconds < 500 ? milliseconds : 1000 - milliseconds;
    const success: boolean = await recordAttempt(user.id, diff);

    if (success) {
      // Оповещаем пользователя о результате
      toast.success(`Отклонение: ${diff} мс`);

      const userAttempts = await getUserAttempts(user.id);
      setAttempts(userAttempts);

      // Обновляем данные пользователя
      const updatedUser = await getUser(user.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);

        // Проверяем, закончились ли попытки у пользователя
        if (updatedUser.attempts_left <= 0) {
          toast.info(
            `Попытки закончились! Ваша скидка: ${formatDiscount(
              updatedUser.discount
            )}`
          );
          findBestResult(userAttempts);
        }
      }
    }

    resetTimer();
    startTimer();
  };

  if (!user || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Haim Clicker</h1>

      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="timer text-4xl font-mono mb-6 text-center">{time}</div>

        <button
          onClick={handleAttempt}
          className={`w-full py-4 rounded-lg text-xl font-bold transition-colors ${
            isButtonDisabled || currentUser.attempts_left <= 0
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Нажать
        </button>

        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Попытки:</h2>
          <p className="mb-2">Осталось попыток: {currentUser.attempts_left}</p>
          {currentUser.best_result !== null && (
            <p className="mb-2">
              Лучший результат: {currentUser.best_result} мс (Скидка:{" "}
              {formatDiscount(currentUser.discount)})
            </p>
          )}

          <table className="w-full mt-4 border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Отклонение (мс)</th>
                <th className="p-2 text-left">Дата и время</th>
              </tr>
            </thead>
            <tbody>
              {[...displayedAttempts].reverse().map((attempt, index) => (
                <tr
                  key={index}
                  className={
                    currentUser.attempts_left <= 0 &&
                    displayedAttempts.length - 1 - index === bestResultIndex
                      ? "bg-green-700"
                      : index % 2 === 0
                      ? "bg-gray-800"
                      : "bg-gray-700"
                  }
                >
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">{attempt.difference}</td>
                  <td className="p-2">
                    {new Date(attempt.created_at).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }) +
                      " " +
                      new Date(attempt.created_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                      })}
                  </td>
                </tr>
              ))}

              {displayedAttempts.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-2 text-center">
                    Нет попыток
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => setShowRules(true)}
          className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Правила игры
        </button>
      </div>

      <ModalRules
        isOpen={showRules}
        onRequestClose={() => setShowRules(false)}
      />
    </div>
  );
};

export default Game;
