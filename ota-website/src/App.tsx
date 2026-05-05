import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BookingProvider } from './context/BookingContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

import { Home } from './pages/Home';
import { SearchResults } from './pages/SearchResults';
import { PropertyDetails } from './pages/PropertyDetails';
import { BookingForm } from './pages/BookingForm';
import { Payment } from './pages/Payment';
import { Confirmation } from './pages/Confirmation';

function App() {
  return (
    <Router>
      <BookingProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/property/:id" element={<PropertyDetails />} />
              <Route path="/book" element={<BookingForm />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/confirmation" element={<Confirmation />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BookingProvider>
    </Router>
  );
}

export default App;
