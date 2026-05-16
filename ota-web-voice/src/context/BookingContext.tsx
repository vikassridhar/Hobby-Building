import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { SearchCriteria, Property, Room, BookingDetails } from '../types';

interface BookingContextType {
  searchCriteria: SearchCriteria;
  setSearchCriteria: (criteria: Partial<SearchCriteria>) => void;
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  bookingDetails: BookingDetails;
  setBookingDetails: (details: Partial<BookingDetails>) => void;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchCriteria, setSearchCriteriaState] = useState<SearchCriteria>({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 2,
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingDetails, setBookingDetailsState] = useState<BookingDetails>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
  });

  const setSearchCriteria = (criteria: Partial<SearchCriteria>) => {
    setSearchCriteriaState((prev) => ({ ...prev, ...criteria }));
  };

  const setBookingDetails = (details: Partial<BookingDetails>) => {
    setBookingDetailsState((prev) => ({ ...prev, ...details }));
  };

  const resetBooking = () => {
    setSearchCriteriaState({ location: '', checkIn: '', checkOut: '', guests: 2 });
    setSelectedProperty(null);
    setSelectedRoom(null);
    setBookingDetailsState({ firstName: '', lastName: '', email: '', phone: '', specialRequests: '' });
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
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export const useBookingContext = useBooking;
