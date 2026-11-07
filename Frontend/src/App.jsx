import React, { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ShieldAlert } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// Client Pages
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import SeatLayout from './pages/SeatLayout';
import BookingPage from './pages/BookingPage';
import Theaters from './pages/Theaters';
import Releases from './pages/Releases';
import Favorites from './pages/Favorite';
import MyBooking from './pages/MyBooking';
import Profile from './pages/Profile';
import PaymentCallback from './pages/PaymentCallback';
import ResetPassword from './pages/ResetPassword';

// Layout & Auth
import PublicLayout from './components/PublicLayout';
import { useAuth } from './auth/AuthContext';

// Admin Portal Pages & Layout
import AdminLayout from './components/admin/layout/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminMovies from './pages/admin/AdminMovies';
import AdminCinemas from './pages/admin/AdminCinemas';
import AdminShowtimes from './pages/admin/AdminShowtimes';
import AdminSnacks from './pages/admin/AdminSnacks';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, openLoginModal } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      const redirectPath = location.pathname + location.search;
      sessionStorage.setItem('redirect_after_login', redirectPath);
      openLoginModal();
    }
  }, [isAuthenticated, location, openLoginModal]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-xl font-bold mb-3 text-red-500">Yêu Cầu Đăng Nhập</h2>
          <p className="text-slate-400 text-sm mb-6">
            Bạn cần đăng nhập để tiếp tục thao tác. Vui lòng đăng nhập qua cửa sổ xác thực.
          </p>
          <button
            onClick={() => openLoginModal()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-xl transition cursor-pointer"
          >
            Mở cửa sổ Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, openLoginModal } = useAuth();
  const location = useLocation();
  const isAdmin = user?.roles?.some((role) => role.toLowerCase() === 'admin');

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem(
        'redirect_after_login',
        `${location.pathname}${location.search}`
      );
      openLoginModal();
    }
  }, [isAuthenticated, location.pathname, location.search, openLoginModal]);

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-2xl font-bold">Cần đăng nhập quản trị</h1>
          <p className="mt-2 text-sm text-slate-400">
            Đăng nhập bằng tài khoản có quyền Admin để tiếp tục.
          </p>
          <button
            type="button"
            onClick={openLoginModal}
            className="mt-6 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500"
          >
            Mở cửa sổ đăng nhập
          </button>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <section className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-300" />
          <h1 className="mt-4 text-2xl font-bold">Tài khoản chưa có quyền Admin</h1>
          <p className="mt-2 text-sm text-slate-400">
            Tài khoản hiện tại không được phép truy cập khu vực quản trị. Hãy đăng xuất và đăng nhập bằng tài khoản quản trị.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5">
              Về trang chủ
            </Link>
            <Link to="/profile" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500">
              Kiểm tra tài khoản
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return children;
};

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        {/* Admin Portal Routes (Bảo vệ bởi AdminRoute) */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="movies" element={<AdminMovies />} />
          <Route path="cinemas" element={<AdminCinemas />} />
          <Route path="showtimes" element={<AdminShowtimes />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="snacks" element={<AdminSnacks />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        {/* Client Portal Routes (Tự động kèm Navbar & Footer qua PublicLayout) */}
        <Route element={<PublicLayout />}>
          <Route path='/' element={<Home />} />
          <Route path='/movies' element={<Movies />} />
          <Route path='/movie/:id' element={<MovieDetail />} />
          <Route path='/movies/:id' element={<MovieDetail />} />
          <Route path='/cinemas' element={<Theaters />} />
          <Route path='/theaters' element={<Theaters />} />
          <Route path='/booking/:showtimeId' element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path='/movies/book/:movieId/:showId' element={<ProtectedRoute><SeatLayout /></ProtectedRoute>} />
          <Route path='/releases' element={<Releases />} />
          <Route path='/favorites' element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path='/my-booking' element={<ProtectedRoute><MyBooking /></ProtectedRoute>} />
          <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path='/payment/callback' element={<PaymentCallback />} />
          <Route path='/reset-password' element={<ResetPassword />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
