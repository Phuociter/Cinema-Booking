import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function AuthModal({ mode, onClose }) {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(mode !== 'register');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) await login({ email: form.email, password: form.password });
      else await register(form);
      onClose();
    } catch (submissionError) {
      setError(submissionError.message || 'Không thể xác thực tài khoản');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
            <p className="mt-1 text-sm text-gray-400">{isLogin ? 'Đăng nhập để tiếp tục đặt vé.' : 'Đăng ký tài khoản để đặt vé và lưu phim.'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!isLogin && (
            <>
              <input name="fullName" value={form.fullName} onChange={updateField} placeholder="Họ và tên" required className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-500" />
              <input name="phone" value={form.phone} onChange={updateField} placeholder="Số điện thoại (không bắt buộc)" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-500" />
            </>
          )}
          <input name="email" type="email" value={form.email} onChange={updateField} placeholder="Email" required className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-500" />
          <input name="password" type="password" value={form.password} onChange={updateField} placeholder="Mật khẩu" minLength={6} required className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-500" />
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        <button type="button" onClick={() => { setIsLogin((current) => !current); setError(''); }} className="mt-5 w-full text-sm text-gray-400 hover:text-white">
          {isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </div>
    </div>
  );
}
