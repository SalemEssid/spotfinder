export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Profile extends User {
  stats: { reviewCount: number; reportCount: number; favoriteCount: number; spotCount: number };
}

export interface Review {
  id: number;
  spot: { id: number; name: string };
  author: { id: number; name: string };
  ratings: { wifi: number; calm: number; outlets: number; price: number };
  comment: string;
  createdAt: string;
}

export interface NewReview {
  ratingWifi: number;
  ratingCalm: number;
  ratingOutlets: number;
  ratingPrice: number;
  comment: string;
}

/** Error body returned by the API for every 4xx/5xx. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
    retryAfterSeconds?: number;
    nextReportAllowedAt?: string;
  };
}
