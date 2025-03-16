import React from 'react';
import { supabase } from '../supabase/client';

const AdminPanel = () => {
  const resetAttempts = async () => {
    try {
      const { error } = await supabase
        .from('attempts')
        .delete()
        .neq('user_id', '0'); // Assuming user_id '0' is a default value and should not be deleted

      if (error) {
        console.error('Ошибка при сбросе попыток:', error);
        alert('Ошибка при сбросе попыток. Смотрите консоль для деталей.');
      } else {
        alert('Попытки пользователей успешно сброшены!');
      }
    } catch (error) {
      console.error('Ошибка при сбросе попыток:', error);
      alert('Произошла ошибка при сбросе попыток. Смотрите консоль для деталей.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Game Management</h2>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={resetAttempts}
        >
          Сбросить попытки
        </button>
        <div className="mt-2">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Количество попыток:
          </label>
          <input
            type="number"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            defaultValue={10}
          />
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2">
            Изменить
          </button>
        </div>
        {/* Функциональность для изменения диапазонов скидок */}
        <p>Функциональность для изменения диапазонов скидок будет реализована здесь.</p>
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">User Data Management</h2>
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Экспорт данных пользователей
        </button>
        {/* Функциональность для просмотра и экспорта данных пользователей */}
        <p>Функциональность для просмотра данных пользователей будет реализована здесь.</p>
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Admin Actions Log</h2>
        {/* Функциональность для логирования действий администратора */}
        <p>Функциональность для логирования действий администратора будет реализована здесь.</p>
      </section>
    </div>
  );
};

export default AdminPanel;