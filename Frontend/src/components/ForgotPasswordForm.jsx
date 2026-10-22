import { useState } from 'react';
import { accountApi } from '../api/useAccount';

const inputClassName = 'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-500';
const genericResponse = 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';

export default function ForgotPasswordForm({ initialEmail = '', onBack }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await accountApi.forgotPassword(email);
      setMessage(response.message || genericResponse);
    } catch {
      setMessage(genericResponse);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-gray-400">
        Nhập email tài khoản Local để nhận liên kết khôi phục. Tài khoản Clerk/Google cần được khôi phục qua nhà cung cấp đăng nhập.
      </p>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        maxLength={254}
        autoComplete="email"
        required
        className={inputClassName}
      />
      {message && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full cursor-pointer rounded-lg bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
      </button>
      <button type="button" onClick={() => onBack(email)} className="w-full cursor-pointer text-sm text-gray-400 hover:text-white">
        Quay lại đăng nhập
      </button>
    </form>
  );
}
