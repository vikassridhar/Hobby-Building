export interface Room {
  id: string;
  name: string;
  price: number;
  capacity: number;
  beds: string;
}

export interface Review {
  id: string;
  author: string;
  rating: string;
  comment: string;
  date: string;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  rating: number;
  stars: number; // 1-5 star category
  propertyType: string; // Hotel, Resort, Apartment, etc.
  distanceFromCenter: number; // in km
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  popularityScore: number; // 1-100 for "Recommended" sort
  reviewsCount: number;
  pricePerNight: number;
  images: string[];
  amenities: string[];
  description: string;
  reviews: Review[];
  rooms: Room[];
}

export interface SearchCriteria {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface BookingDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests?: string;
}
