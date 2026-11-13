// Adds `req.user` to Express' Request type. It is filled by the `optionalAuth` middleware
// when the request carries a valid session cookie.
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: 'user' | 'admin' };
    }
  }
}

export {};
