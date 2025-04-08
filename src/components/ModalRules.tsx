import React from "react";
import Modal from "react-modal";
import { useGameStore } from "../store/game";
import { BookOpen, Target, Smile, X } from 'lucide-react'; // Import icons

// Set the app element for accessibility
Modal.setAppElement("#root");

interface ModalRulesProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

const ModalRules: React.FC<ModalRulesProps> = ({ isOpen, onRequestClose }) => {
  const { getSmileRanges, getCooldownMinutes, settings } = useGameStore(); // Get helpers and settings
  const smileRanges = getSmileRanges();
  const cooldownMinutes = getCooldownMinutes();
  const attemptsPerSession = settings?.attempts_number ?? 10;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Game Rules"
      className="max-w-2xl mx-auto mt-20 p-6 bg-black rounded-lg shadow-lg max-h-[90vh] overflow-y-auto hidden-scrollbar border-2 border-blue-500" // Added border and max height
      overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" // Added padding to overlay
    >
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-300 flex items-center justify-center gap-2">
          Game Rules
          <BookOpen size={24} />
        </h2>
        {/* Centered and colored title */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-blue-200 flex items-center gap-1">
            Objective:
            <Target size={18} />
          </h3>
          {/* Colored subheading */}
          <p>
            The goal is to get the best possible click accuracy (closest to 0ms
            difference from a whole second). Your final score for the session is
            the number of smiles corresponding to your single best attempt.
          </p>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-blue-200">
            How to Play:
          </h3>
          {/* Colored subheading */}
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Watch the timer, which shows the current time down to milliseconds
              (HH:MM:SS:mmm).
            </li>
            <li>
              Click the button when the milliseconds are as close to 000 as
              possible.
            </li>
            <li>
              After each click, the button is disabled for 2 seconds to prevent
              auto-clicking.
            </li>
            <li>
              You have <span className="bg-gray-500 px-1">{attemptsPerSession} attempts</span> per session. After using
              all attempts, the smiles awarded for your best attempt will be
              shown.
            </li>
            <li>
              A new session of attempts becomes available {" "}
              {cooldownMinutes} minute(s) after your last attempt of the
              previous session.
            </li>
          </ol>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-blue-200 flex items-center gap-1">
            Earning Smiles:
            <Smile size={18} />
          </h3>
          {/* Colored subheading */}
          <p className="mb-2">
            The number of smiles awarded for an attempt depends on its accuracy
            (lower difference is better):
          </p>
          <table className="w-full border-collapse border border-gray-600">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-600 px-4 py-2">
                  Difference (ms)
                </th>
                <th className="border border-gray-600 px-4 py-2">Smiles 😊</th>
              </tr>
            </thead>
            <tbody>
              {smileRanges.map((range, index) => (
                <tr
                  key={range.min} // Use min as key, assuming ranges are stable
                  className={index % 2 === 0 ? "bg-gray-700" : "bg-gray-800"}
                >
                  {/* Alternating row colors */}
                  <td className="border border-gray-600 px-4 py-2 text-center">
                    {/* Centered text */}
                    {/* Corrected Range Display Logic */}
                    {range.min === 0 && range.max === 0 ? "0" : ""}
                    {range.min > 0 && range.max !== null
                      ? `${range.min} – ${range.max}`
                      : ""}
                    {range.max === null ? `${range.min}+` : ""}
                  </td>
                  <td className="border border-gray-600 px-4 py-2 text-center">
                    {range.smiles}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Removed "About the Creator" section */}
        <button
          onClick={onRequestClose}
          className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-center gap-2" // Added focus style and flex
        >
          Close
          <X size={20} />
        </button>
      </div>
    </Modal>
  );
};

export default ModalRules;
