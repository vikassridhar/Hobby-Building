import { useParams, Link } from 'react-router-dom';

export default function BookingConfirmation() {
  const { bookingId } = useParams();

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center animate-scale-in">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-2">Booking Confirmed! 🎉</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Your reservation has been successfully made</p>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-left mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">Booking Reference</span>
          <span className="font-mono font-bold text-ocean-600 dark:text-ocean-400">{bookingId}</span>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Check-in</span>
            <span className="font-medium">May 15, 2026</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Check-out</span>
            <span className="font-medium">May 18, 2026</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="text-green-600 dark:text-green-400 font-medium">Confirmed ✓</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-6 text-sm text-amber-700 dark:text-amber-300">
        📧 A confirmation email has been sent (demo — no actual email)
      </div>

      <div className="flex gap-3">
        <Link to="/trips"
          className="flex-1 bg-ocean-500 hover:bg-ocean-600 text-white font-bold py-3 rounded-xl transition-colors text-center">
          View My Trips
        </Link>
        <Link to="/"
          className="flex-1 border border-gray-200 dark:border-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
