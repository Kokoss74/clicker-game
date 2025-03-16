import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/game'
import { Database } from '../lib/database.types'

type User = Database['public']['Tables']['users']['Row']

const AdminPanel: React.FC = () => {
  const { loadSettings, settings } = useGameStore()
  const [attemptsNumber, setAttemptsNumber] = useState<number>(10)
  const [discountRanges, setDiscountRanges] = useState<Record<string, number>>({
    '0': 25,
    '10': 15,
    '50': 10,
    '100': 5,
    '1000': 3
  })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    loadSettings()
    loadUsers()
  }, [])

  // Обновляем состояние, когда настройки загружены
  useEffect(() => {
    if (settings) {
      setAttemptsNumber(settings.attempts_number)
      
      // Если discount_ranges есть и это объект или строка, которую можно распарсить
      if (settings.discount_ranges) {
        try {
          const ranges = typeof settings.discount_ranges === 'string' 
            ? JSON.parse(settings.discount_ranges as string) 
            : settings.discount_ranges
          
          if (typeof ranges === 'object') {
            setDiscountRanges(ranges as Record<string, number>)
          }
        } catch (error) {
          console.error('Ошибка при парсинге discount_ranges:', error)
        }
      }
    }
  }, [settings])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error)
      toast.error('Ошибка при загрузке пользователей')
    } finally {
      setLoading(false)
    }
  }

  const updateAttemptsNumber = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('game_settings')
        .update({ attempts_number: attemptsNumber })
        .eq('id', 1)

      if (error) throw error
      toast.success('Количество попыток обновлено')
      await loadSettings()
    } catch (error) {
      console.error('Ошибка при обновлении количества попыток:', error)
      toast.error('Ошибка при обновлении')
    } finally {
      setLoading(false)
    }
  }

  const updateDiscountRanges = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('game_settings')
        .update({ discount_ranges: discountRanges })
        .eq('id', 1)

      if (error) throw error
      toast.success('Диапазоны скидок обновлены')
      await loadSettings()
    } catch (error) {
      console.error('Ошибка при обновлении диапазонов скидок:', error)
      toast.error('Ошибка при обновлении')
    } finally {
      setLoading(false)
    }
  }

  const resetAttempts = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('attempts')
        .delete()
        .neq('user_id', '0')

      if (error) throw error

      // Сбрасываем попытки пользователей
      const { error: resetError } = await supabase
        .from('users')
        .update({
          attempts_left: settings?.attempts_number || 10,
          best_result: null,
          discount: 0
        })

      if (resetError) throw resetError

      toast.success('Попытки пользователей сброшены')
      await loadUsers()
    } catch (error) {
      console.error('Ошибка при сбросе попыток:', error)
      toast.error('Ошибка при сбросе попыток')
    } finally {
      setLoading(false)
    }
  }

  const exportUsersData = () => {
    try {
      // Создаем CSV строку
      let csvContent = "Имя,Телефон,Лучший результат,Скидка,Осталось попыток,Создан\n";
      
      users.forEach(user => {
        const row = [
          user.name,
          user.phone,
          user.best_result !== null ? user.best_result : '-',
          user.discount,
          user.attempts_left,
          new Date(user.created_at).toLocaleString('ru-RU')
        ].join(',');
        
        csvContent += row + "\n";
      });
      
      // Создаем blob и ссылку для скачивания
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      
      toast.success('Экспорт данных выполнен успешно');
    } catch (error) {
      console.error('Ошибка при экспорте данных:', error);
      toast.error('Ошибка при экспорте данных');
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-8">Административная панель</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Управление игрой */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Управление игрой</h2>
          
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Количество попыток:
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={attemptsNumber}
                onChange={(e) => setAttemptsNumber(parseInt(e.target.value))}
              />
              <button 
                onClick={updateAttemptsNumber}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
              >
                Изменить
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Диапазоны скидок:
            </label>
            <div className="space-y-2">
              {Object.entries(discountRanges)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([range, discount]) => (
                  <div key={range} className="flex gap-2 items-center">
                    <div className="text-gray-400">
                      {range === '0' ? '0' : range === '1000' ? '>100' : `≤ ${range}`}:
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="shadow appearance-none border rounded w-20 py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={discount}
                      onChange={(e) => {
                        const newRanges = { ...discountRanges, [range]: parseInt(e.target.value) };
                        setDiscountRanges(newRanges);
                      }}
                    />
                    <div className="text-gray-400">%</div>
                  </div>
                ))}
              <button 
                onClick={updateDiscountRanges}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 mt-2"
              >
                Обновить скидки
              </button>
            </div>
          </div>
          
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-4 w-full"
            onClick={resetAttempts}
            disabled={loading}
          >
            Сбросить попытки всех пользователей
          </button>
        </div>
        
        {/* Управление данными пользователей */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Данные пользователей</h2>
          
          <button 
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
            onClick={exportUsersData}
            disabled={loading || users.length === 0}
          >
            Экспорт данных пользователей
          </button>
          
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Имя
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Скидка
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Попытки
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{user.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{user.discount}%</td>
                    <td className="px-4 py-2 whitespace-nowrap">{user.attempts_left}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center">
                      {loading ? 'Загрузка...' : 'Нет данных'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel