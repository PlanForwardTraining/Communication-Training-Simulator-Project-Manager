export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  disc_profile: string;
  role: 'pm' | 'admin';
  created_at: string;
}

export interface JwtPayload {
  userId: number;
  role: 'pm' | 'admin';
}

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
