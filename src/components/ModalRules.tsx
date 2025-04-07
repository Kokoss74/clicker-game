import React from 'react'
import Modal from 'react-modal'

// Set the app element for accessibility
Modal.setAppElement('#root')

interface ModalRulesProps {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalRules: React.FC<ModalRulesProps> = ({ isOpen, onRequestClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Game Rules"
      className="max-w-2xl mx-auto mt-20 p-6 bg-black rounded-lg shadow-lg max-h-screen overflow-y-auto hidden-scrollbar"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-4">Game Rules</h2>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Objective:</h3>
          <p>
            The goal is to collect as many smiles as possible by clicking the button as close to a whole second as you can.
          </p>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">How to Play:</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Watch the timer, which shows the current time down to milliseconds (HH:MM:SS:mmm).
            </li>
            <li>
              Click the button when the milliseconds are as close to 000 as possible.
            </li>
            <li>
              After each click, the button is disabled for 2 seconds to prevent auto-clicking.
            </li>
            <li>
              You have 10 attempts per session. After using all attempts, your total smiles for the session will be shown.
            </li>
            <li>
              A new session of 10 attempts becomes available 1 hour after your last attempt of the previous session.
            </li>
          </ol>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Earning Smiles:</h3>
          <p className="mb-2">
            The number of smiles earned per attempt depends on your accuracy (the difference from a whole second):
          </p>
          <table className="w-full border-collapse border border-gray-600">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-600 px-4 py-2">Difference (ms)</th>
                <th className="border border-gray-600 px-4 py-2">Smiles 😊</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-600 px-4 py-2">0</td>
                <td className="border border-gray-600 px-4 py-2 text-center">33</td>
              </tr>
              <tr>
                <td className="border border-gray-600 px-4 py-2">1 – 10</td>
                <td className="border border-gray-600 px-4 py-2 text-center">15</td>
              </tr>
              <tr>
                <td className="border border-gray-600 px-4 py-2">11 – 50</td>
                <td className="border border-gray-600 px-4 py-2 text-center">10</td>
              </tr>
              <tr>
                <td className="border border-gray-600 px-4 py-2">51 – 100</td>
                <td className="border border-gray-600 px-4 py-2 text-center">5</td>
              </tr>
              <tr>
                <td className="border border-gray-600 px-4 py-2">{'>'} 100</td>
                <td className="border border-gray-600 px-4 py-2 text-center">3</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-700">
           <h3 className="text-lg font-semibold mb-2">About the Creator:</h3>
           <p>Pasha Feldman - Skilled Software Engineer with 3+ years of experience and strong AI expertise, seeking a mid-level Full Stack Developer role.</p>
           {/* Add contact links if available, e.g., LinkedIn, GitHub */}
        </div>
        <button
          onClick={onRequestClose}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default ModalRules