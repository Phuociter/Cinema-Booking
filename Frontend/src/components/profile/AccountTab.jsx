import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { accountApi } from '../../api/useAccount';
import { resolveApiAssetUrl } from '../../api/axiosInstance';
import { useAuth } from '../../auth/AuthContext';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const AccountTab = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    avatarUrl: user?.avatarUrl ?? '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(() => resolveApiAssetUrl(user?.avatarUrl));
  const [avatarPreviewFailed, setAvatarPreviewFailed] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    let isMounted = true;

    accountApi.getProfile()
      .then((currentProfile) => {
        if (!isMounted) return;
        setProfile({
          fullName: currentProfile.fullName ?? '',
          email: currentProfile.email ?? '',
          phone: currentProfile.phone ?? '',
          avatarUrl: currentProfile.avatarUrl ?? '',
        });
        setAvatarPreviewUrl(resolveApiAssetUrl(currentProfile.avatarUrl));
        updateUser(currentProfile);
      })
      .catch((error) => {
        if (isMounted) toast.error(error.message || 'Không thể tải hồ sơ tài khoản.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [updateUser]);

  useEffect(() => () => {
    if (avatarPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
  }, [avatarPreviewUrl]);

  const handleProfileChange = (event) => {
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleAvatarSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Vui lòng chọn ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error('Ảnh đại diện không được vượt quá 5 MB.');
      return;
    }

    setSelectedAvatar(file);
    setAvatarPreviewFailed(false);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatar) return;

    setIsUploadingAvatar(true);
    try {
      const updatedProfile = await accountApi.uploadAvatar(selectedAvatar);
      setProfile((current) => ({
        ...current,
        avatarUrl: updatedProfile.avatarUrl ?? '',
      }));
      updateUser(updatedProfile);
      setSelectedAvatar(null);
      setAvatarPreviewUrl(resolveApiAssetUrl(updatedProfile.avatarUrl));
      setAvatarPreviewFailed(false);
      toast.success('Ảnh đại diện đã được cập nhật.');
    } catch (error) {
      toast.error(error.message || 'Không thể tải ảnh đại diện lên.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const updatedProfile = await accountApi.updateProfile({
        fullName: profile.fullName,
        phone: profile.phone,
      });
      setProfile((current) => ({
        ...current,
        fullName: updatedProfile.fullName ?? '',
        email: updatedProfile.email ?? current.email,
        phone: updatedProfile.phone ?? '',
      }));
      updateUser(updatedProfile);
      toast.success('Thông tin cá nhân đã được cập nhật.');
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật thông tin cá nhân.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await accountApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Đổi mật khẩu thành công.');
    } catch (error) {
      toast.error(error.message || 'Không thể đổi mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const authProvider = user?.authProvider?.toLowerCase();
  const isClerkAccount = authProvider === 'clerk';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-6">
        <h2 className="mb-5 text-xl font-bold text-white">Thông Tin Cá Nhân</h2>
        <form onSubmit={handleSaveProfile} className="max-w-md space-y-4">
          <div>
            <label htmlFor="profile-avatar-file" className="mb-1 block text-sm text-slate-400">Ảnh đại diện</label>
            <div className="mb-3 flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-slate-900 text-xl font-bold uppercase text-white">
                {profile.fullName.trim().charAt(0) || 'U'}
                {avatarPreviewUrl && !avatarPreviewFailed && (
                  <img
                    src={avatarPreviewUrl}
                    alt="Xem trước ảnh đại diện"
                    className="absolute h-16 w-16 rounded-full object-cover"
                    onError={() => setAvatarPreviewFailed(true)}
                  />
                )}
              </div>
              <p className="text-xs text-slate-400">Chọn ảnh JPEG, PNG hoặc WebP, dung lượng tối đa 5 MB.</p>
            </div>
            <input
              id="profile-avatar-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelection}
              disabled={isLoading || isUploadingAvatar}
              className="block w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 text-sm text-slate-300 file:mr-4 file:cursor-pointer file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-white hover:file:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {selectedAvatar && (
              <button
                type="button"
                onClick={handleAvatarUpload}
                disabled={isLoading || isUploadingAvatar}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingAvatar ? 'Đang tải ảnh lên...' : 'Tải ảnh đại diện lên'}
              </button>
            )}
          </div>
          <div>
            <label htmlFor="profile-full-name" className="mb-1 block text-sm text-slate-400">Họ và tên</label>
          <input
            id="profile-full-name"
            name="fullName"
            type="text"
            value={profile.fullName}
            onChange={handleProfileChange}
            maxLength={150}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-red-500"
          />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-1 block text-sm text-slate-400">Email</label>
          <input
            id="profile-email"
            type="email"
            value={profile.email}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-400"
          />
          </div>
          <div>
            <label htmlFor="profile-phone" className="mb-1 block text-sm text-slate-400">Số điện thoại</label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              value={profile.phone}
              onChange={handleProfileChange}
              placeholder="Nhập số điện thoại gồm 10 chữ số"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-red-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || isSavingProfile || isUploadingAvatar}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">Bảo Mật Tài Khoản</h2>
        {isClerkAccount ? (
          <div className="max-w-xl rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200">
            <span className="mb-1 inline-flex rounded-full bg-blue-500/20 px-3 py-1 font-semibold">
              Tài khoản liên kết Clerk/Google
            </span>
            <p className="mt-2">Hãy quản lý hoặc khôi phục mật khẩu trực tiếp qua Clerk/Google.</p>
          </div>
        ) : authProvider !== 'local' ? (
          <p className="text-sm text-slate-400">
            {isLoading ? 'Đang xác minh phương thức đăng nhập...' : 'Chưa thể xác minh phương thức đăng nhập để đổi mật khẩu.'}
          </p>
        ) : (
          <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
            <div>
              <label htmlFor="current-password" className="mb-1 block text-sm text-slate-400">Mật khẩu hiện tại</label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm text-slate-400">Mật khẩu mới</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={passwords.newPassword}
                onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm text-slate-400">Xác nhận mật khẩu mới</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={passwords.confirmPassword}
                onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChangingPassword ? 'Đang cập nhật...' : 'Đổi Mật Khẩu'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

export default AccountTab;
