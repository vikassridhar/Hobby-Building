import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Property, Room, SearchCriteria, BookingDetails } from '../types';

interface BookingContextType {
  searchCriteria: SearchCriteria | null;
  setSearchCriteria: (criteria: SearchCriteria) => void;
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  bookingDetails: BookingDetails | null;
  setBookingDetails: (details: BookingDetails) => void;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  const resetBooking = () => {
    setSelectedProperty(null);
    setSelectedRoom(null);
    setBookingDetails(null);
  };

  return (
    <BookingContext.Provider
      value={{
        searchCriteria,
        setSearchCriteria,
        selectedProperty,
        setSelectedProperty,
        selectedRoom,
        setSelectedRoom,
        bookingDetails,
        setBookingDetails,
        resetBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
