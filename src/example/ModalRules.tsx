import React from 'react'
import Modal from 'react-modal'

interface ModalRulesProps {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalRules: React.FC<ModalRulesProps> = ({ isOpen, onRequestClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Правила игры"
      className="max-w-2xl mx-auto mt-20 p-6 bg-black rounded-lg shadow-lg max-h-screen overflow-y-auto hidden-scrollbar"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div>
        <h2 className="text-2xl font-bold mb-4">Правила игры</h2>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Цель игры:</h3>
          <p>
            Цель игры - получить максимальную скидку, нажимая кнопку максимально близко к целой секунде.
          </p>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Как играть:</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Следите за таймером, который показывает текущее время с точностью до миллисекунд (HH:MM:SS:mmm).
            </li>
            <li>
              Нажимайте на кнопку так, чтобы момент нажатия был максимально близок к целой секунде (т.е. когда миллисекунды равны 000).
            </li>
            <li>
              После каждого нажатия кнопка блокируется на 500 мс для защиты от автокликеров.
            </li>
            <li>
              У вас есть 10 попыток, после которых будет определена ваша скидка.
            </li>
          </ol>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Расчет скидки:</h3>
          <p className="mb-2">
            Скидка определяется по лучшей попытке (минимальному отклонению от целой секунды) по следующей таблице:
          </p>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-black">
                <th className="border border-gray-300 px-4 py-2">Отклонение (мс)</th>
                <th className="border border-gray-300 px-4 py-2">Скидка (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">0</td>
                <td className="border border-gray-300 px-4 py-2">25%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">1 – 10</td>
                <td className="border border-gray-300 px-4 py-2">15%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">11 – 50</td>
                <td className="border border-gray-300 px-4 py-2">10%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">51 – 100</td>
                <td className="border border-gray-300 px-4 py-2">5%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">{'>'} 100</td>
                <td className="border border-gray-300 px-4 py-2">3%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          onClick={onRequestClose}
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </Modal>
  )
}

export default ModalRules