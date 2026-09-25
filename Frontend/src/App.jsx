import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Client Pages
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import SeatLayout from './pages/SeatLayout';
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
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
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
          <Route path='/booking/:showtimeId' element={<ProtectedRoute><SeatLayout /></ProtectedRoute>} />
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
