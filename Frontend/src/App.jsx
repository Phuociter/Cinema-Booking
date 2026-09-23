import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import SeatLayout from './pages/SeatLayout';
import MyBooking from './pages/MyBooking';
import Movies from './pages/Movies';
import { Toaster } from 'react-hot-toast';
import PublicLayout from './components/PublicLayout';
import Favorites from './pages/Favorite';
import Releases from './pages/Releases';
import Theaters from './pages/Theaters';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './auth/AuthContext';

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
        <Route path='/admin/*' element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route element={<PublicLayout />}>
          <Route path='/' element={<Home />} />
          <Route path='/movies' element={<Movies />} />
          <Route path='/movies/:id' element={<MovieDetail />} />
          <Route path="/movies/book/:movieId/:showId" element={<ProtectedRoute><SeatLayout /></ProtectedRoute>} />
          <Route path='/my-booking' element={<ProtectedRoute><MyBooking /></ProtectedRoute>} />
          <Route path='/favorites' element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path='/releases' element={<Releases/>} />
          <Route path='/theaters' element={<Theaters/>} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
