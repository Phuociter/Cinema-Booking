import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

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

// Admin Portal Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminMovies from './pages/admin/AdminMovies';
import AdminCinemas from './pages/admin/AdminCinemas';
import AdminShowtimes from './pages/admin/AdminShowtimes';
import AdminSnacks from './pages/admin/AdminSnacks';
import AdminUsers from './pages/admin/AdminUsers';

const App = () => {
  const location = useLocation();
  const isExcludedLayout = location.pathname.startsWith('/admin');

  return (
    <>
      <Toaster />
      {!isExcludedLayout && <Navbar />}
      <Routes>
        {/* Client Portal Routes */}
        <Route path='/' element={<Home />} />
        <Route path='/movies' element={<Movies />} />
        <Route path='/movie/:id' element={<MovieDetail />} />
        <Route path='/movies/:id' element={<MovieDetail />} /> {/* Tương thích ngược */}
        <Route path='/cinemas' element={<Theaters />} />
        <Route path='/theaters' element={<Theaters />} /> {/* Tương thích ngược */}
        <Route path='/booking/:showtimeId' element={<SeatLayout />} />
        <Route path='/movies/book/:movieId/:showId' element={<SeatLayout />} /> {/* Tương thích ngược */}
        <Route path='/releases' element={<Releases />} />
        <Route path='/favorites' element={<Favorites />} />
        <Route path='/my-booking' element={<MyBooking />} /> {/* Tương thích ngược */}
        <Route path='/profile' element={<Profile />} />
        <Route path='/payment/callback' element={<PaymentCallback />} />

        {/* Admin Portal Routes */}
        <Route path='/admin/dashboard' element={<AdminDashboard />} />
        <Route path='/admin/movies' element={<AdminMovies />} />
        <Route path='/admin/cinemas' element={<AdminCinemas />} />
        <Route path='/admin/showtimes' element={<AdminShowtimes />} />
        <Route path='/admin/snacks' element={<AdminSnacks />} />
        <Route path='/admin/users' element={<AdminUsers />} />
      </Routes>
      {!isExcludedLayout && <Footer />}
    </>
  );
};

export default App;
