import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-red-400" />
          <div>
            <p className="text-sm text-red-300">Admin Portal</p>
            <h1 className="text-3xl font-semibold">Xin chào, {user?.fullName || user?.email}</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-gray-400">
          Route này chỉ hiển thị với tài khoản có role Admin. Các màn hình quản trị nghiệp vụ sẽ được gắn vào shared layout này.
        </p>
      </div>
    </main>
  );
}
