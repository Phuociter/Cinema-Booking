import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { accountApi } from '../api/useAccount';
import { useAuth } from '../auth/AuthContext';

const inputClassName = 'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-500';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openLoginModal } = useAuth();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      await accountApi.resetPassword(token, newPassword);
      setIsComplete(true);
      toast.success('Đặt lại mật khẩu thành công.');
    } catch (submitError) {
      setError(submitError.message || 'Liên kết không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isComplete) return;
    navigate('/', { replace: true });
    openLoginModal();
  }, [isComplete, navigate, openLoginModal]);

  if (!token) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 py-12 text-white">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 text-center shadow-xl">
          <h1 className="text-2xl font-bold">Thiếu liên kết khôi phục</h1>
          <p className="mt-3 text-sm text-slate-400">URL không có token đặt lại mật khẩu. Hãy yêu cầu gửi liên kết mới.</p>
          <Link to="/" className="mt-6 inline-flex rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-500">
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">{isComplete ? 'Mật khẩu đã được cập nhật' : 'Đặt lại mật khẩu'}</h1>
        {isComplete ? (
          <p className="mt-3 text-sm text-slate-400">Đang chuyển về trang chủ để bạn đăng nhập bằng mật khẩu mới.</p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <p className="text-sm text-slate-400">Tạo mật khẩu mới có ít nhất 6 ký tự.</p>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mật khẩu mới"
              className={inputClassName}
            />
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className={inputClassName}
            />
            {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
