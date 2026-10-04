import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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

// Layout & Auth
import PublicLayout from './components/PublicLayout';
import { useAuth } from './auth/AuthContext';

// Admin Portal Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminMovies from './pages/admin/AdminMovies';
import AdminCinemas from './pages/admin/AdminCinemas';
import AdminShowtimes from './pages/admin/AdminShowtimes';
import AdminSnacks from './pages/admin/AdminSnacks';
import AdminUsers from './pages/admin/AdminUsers';

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
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.roles?.some((role) => role.toLowerCase() === 'admin');

  if (!isAuthenticated) return <Navigate to="/" replace />;
  return isAdmin ? children : <Navigate to="/" replace />;
};

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        {/* Admin Portal Routes (Bảo vệ bởi AdminRoute) */}
        <Route path='/admin' element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path='/admin/dashboard' element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path='/admin/movies' element={<AdminRoute><AdminMovies /></AdminRoute>} />
        <Route path='/admin/cinemas' element={<AdminRoute><AdminCinemas /></AdminRoute>} />
        <Route path='/admin/showtimes' element={<AdminRoute><AdminShowtimes /></AdminRoute>} />
        <Route path='/admin/snacks' element={<AdminRoute><AdminSnacks /></AdminRoute>} />
        <Route path='/admin/users' element={<AdminRoute><AdminUsers /></AdminRoute>} />

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
        </Route>
      </Routes>
    </>
  );
};

export default App;
