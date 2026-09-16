import React, { useState } from 'react';
import AccountTab from '../components/profile/AccountTab';
import BookingHistoryTab from '../components/profile/BookingHistoryTab';

/**
 * Page: Profile.jsx
 * Người sở hữu khung: Dev E
 * Hợp nhất 2 components:
 * - AccountTab: do Dev E phát triển
 * - BookingHistoryTab: do Dev D phát triển
 */
const Profile = () => {
  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'bookings'

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white pt-24 pb-16 px-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Trang Cá Nhân & Lịch Sử Đặt Vé</h1>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-700 mb-6 space-x-6">
        <button
          onClick={() => setActiveTab('account')}
          className={`pb-3 font-semibold text-sm transition-colors cursor-pointer border-b-2 ${
            activeTab === 'account'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Thông Tin Tài Khoản (Dev E)
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 font-semibold text-sm transition-colors cursor-pointer border-b-2 ${
            activeTab === 'bookings'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Vé Của Tôi (Dev D)
        </button>
      </div>

      {/* Render Subcomponents */}
      {activeTab === 'account' ? <AccountTab /> : <BookingHistoryTab />}
    </div>
  );
};

export default Profile;
