import { useState } from 'react';

export default function Account() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Account</h1>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-ocean-400 to-coral-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            V
          </div>
          <div>
            <h2 className="text-xl font-bold">Vikas Sridhar</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">user@example.com</p>
            <p className="text-xs text-gray-400 mt-0.5">Member since April 2026</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          {['profile', 'preferences', 'payments'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-ocean-600 dark:text-ocean-400 border-b-2 border-ocean-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name</label>
                <input defaultValue="Vikas" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Last Name</label>
                <input defaultValue="Sridhar" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input defaultValue="user@example.com" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <input defaultValue="+1-555-123-4567" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
            </div>
            <button className="bg-ocean-500 hover:bg-ocean-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm">
              Save Changes
            </button>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Currency</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <option>USD ($)</option>
                <option>THB (฿)</option>
                <option>EUR (€)</option>
                <option>JPY (¥)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Language</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <option>English</option>
                <option>ไทย</option>
                <option>日本語</option>
                <option>한국어</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-gray-400">Booking confirmations and offers</p>
              </div>
              <div className="w-12 h-6 bg-ocean-500 rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                <div>
                  <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                  <p className="text-xs text-gray-400">Expires 12/27</p>
                </div>
              </div>
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">Default</span>
            </div>
            <button className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-500 hover:border-ocean-400 hover:text-ocean-500 transition-colors">
              + Add Payment Method
            </button>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="space-y-2">
        {[
          { icon: '🔔', label: 'Notifications', count: 3 },
          { icon: '❓', label: 'Help & Support' },
          { icon: '📋', label: 'Terms & Conditions' },
          { icon: '🔒', label: 'Privacy Policy' },
        ].map(item => (
          <button key={item.label} className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.count && <span className="bg-coral-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{item.count}</span>}
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
