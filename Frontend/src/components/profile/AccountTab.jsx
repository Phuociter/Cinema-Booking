import React from 'react';

/**
 * Component: AccountTab.jsx
 * Người sở hữu: Dev E
 * Trách nhiệm: Xem thông tin cá nhân, cập nhật profile và đổi mật khẩu tài khoản
 */
const AccountTab = () => {
  return (
    <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">Thông Tin Cá Nhân (Dev E)</h2>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Họ và tên</label>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
            placeholder="Nguyễn Văn A"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Email</label>
          <input
            type="email"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
            placeholder="user@example.com"
            readOnly
          />
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
          Đổi Mật Khẩu
        </button>
      </div>
    </div>
  );
};

export default AccountTab;
