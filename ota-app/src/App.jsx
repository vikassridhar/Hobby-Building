import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BookingProvider } from './context/BookingContext';
import useBrowserTimer from './hooks/useBrowserTimer';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import HotelDetail from './pages/HotelDetail';
import Booking from './pages/Booking';
import BookingConfirmation from './pages/BookingConfirmation';
import MyTrips from './pages/MyTrips';
import Account from './pages/Account';

export default function App() {
  useBrowserTimer();

  return (
    <ThemeProvider>
      <BookingProvider>
        <BrowserRouter>
          <Navbar />
          <main className="pt-14 md:pt-16 pb-20 md:pb-8 min-h-screen">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/hotel/:id" element={<HotelDetail />} />
              <Route path="/book/:id" element={<Booking />} />
              <Route path="/confirmation/:bookingId" element={<BookingConfirmation />} />
              <Route path="/trips" element={<MyTrips />} />
              <Route path="/account" element={<Account />} />
            </Routes>
          </main>
        </BrowserRouter>
      </BookingProvider>
    </ThemeProvider>
  );
}
