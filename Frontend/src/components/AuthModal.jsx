import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';

const IS_CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function ClerkAuthSection({ isLogin, onClose, setError }) {
  const { loginWithClerk, isAuthenticated } = useAuth();
  const { isSignedIn, getToken } = useClerkAuth();
  const clerk = useClerk();
  const [isClerkLoading, setIsClerkLoading] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    const activeSession = clerk.session || clerk.client?.sessions?.find((s) => s.status === 'active') || clerk.client?.sessions?.[0];

    if ((isSignedIn || activeSession) && !isAuthenticated) {
      const tokenPromise = activeSession ? activeSession.getToken() : getToken();
      tokenPromise
        .then(async (clerkToken) => {
          if (!isSubscribed || !clerkToken) return;
          try {
            await loginWithClerk(clerkToken);
            onClose();
            const redirectUrl = sessionStorage.getItem('redirect_after_login');
            if (redirectUrl) {
              sessionStorage.removeItem('redirect_after_login');
              window.location.href = redirectUrl;
            }
          } catch (syncError) {
            if (isSubscribed) {
              setError(syncError.message || 'Không thể đồng bộ tài khoản Clerk với hệ thống');
            }
          }
        })
        .catch((err) => {
          if (isSubscribed) {
            console.error('Lỗi lấy Clerk Token:', err);
            setError('Không thể lấy mã xác thực từ Clerk');
          }
        });
    }

    return () => {
      isSubscribed = false;
    };
  }, [isSignedIn, isAuthenticated, getToken, loginWithClerk, onClose, setError, clerk]);

  const handleClerkAction = async () => {
    setError('');
    setIsClerkLoading(true);

    try {
      if (isLogin) {
        const activeSession = clerk.session || clerk.client?.sessions?.find((s) => s.status === 'active') || clerk.client?.sessions?.[0];
        if (activeSession) {
          const token = await activeSession.getToken();
          if (token) {
            await loginWithClerk(token);
            onClose();
            const redirectUrl = sessionStorage.getItem('redirect_after_login');
            if (redirectUrl) {
              sessionStorage.removeItem('redirect_after_login');
              window.location.href = redirectUrl;
            }
            return;
          }
        }
        await clerk.openSignIn();
      } else {
        const hasSession = isSignedIn || clerk.session || (clerk.client?.sessions?.length > 0);
        if (hasSession) {
          await clerk.signOut();
        }
        await clerk.openSignUp();
      }
    } catch (err) {
      console.warn('Clerk auth action warning:', err);
      if (err?.code === 'cannot_render_single_session_enabled' || err?.message?.includes('already signed in')) {
        try {
          await clerk.signOut();
          if (isLogin) await clerk.openSignIn();
          else await clerk.openSignUp();
        } catch {
          setError('Vui lòng thử lại.');
        }
      } else {
        setError(err.message || 'Không thể mở cửa sổ xác thực Clerk');
      }
    } finally {
      setIsClerkLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative my-4 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative bg-zinc-950 px-3 text-xs text-gray-400 uppercase tracking-wider">
          Hoặc tiếp tục với
        </span>
      </div>

      <button
        type="button"
        onClick={handleClerkAction}
        disabled={isClerkLoading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3 font-medium text-white transition-all hover:bg-white/10 hover:border-white/30 cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="text-sm font-semibold">
          {isClerkLoading ? 'Đang kết nối...' : isLogin ? 'Đăng nhập với Google / Clerk' : 'Đăng ký với Google / Clerk'}
        </span>
      </button>
    </div>
  );
}

export default function AuthModal({ mode, onClose }) {
  const { login, register, isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(mode !== 'register');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      onClose();
    }
  }, [isAuthenticated, onClose]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) await login({ email: form.email, password: form.password });
      else await register(form);
      onClose();
      const redirectUrl = sessionStorage.getItem('redirect_after_login');
      if (redirectUrl) {
        sessionStorage.removeItem('redirect_after_login');
        window.location.href = redirectUrl;
      }
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
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
            {isSubmitting ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        {IS_CLERK_ENABLED && (
          <ClerkAuthSection isLogin={isLogin} onClose={onClose} setError={setError} />
        )}

        <button type="button" onClick={() => { setIsLogin((current) => !current); setError(''); }} className="mt-5 w-full text-sm text-gray-400 hover:text-white cursor-pointer">
          {isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </div>
    </div>
  );
}
