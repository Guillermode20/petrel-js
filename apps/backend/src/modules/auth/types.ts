import { Elysia } from 'elysia';
import { users } from '../../../db/schema';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  [key: string]: string | number;
}

export interface RefreshPayload {
  userId: number;
  type: 'refresh';
  [key: string]: string | number;
}

export type User = typeof users.$inferSelect;

export type AuthContext = {
  user: JWTPayload;
};

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

export interface MeResponse {
  id: number;
  username: string;
  role: string;
  createdAt: Date;
}

export interface ErrorResponse {
  success: false;
  message: string;
}

export interface SuccessResponse {
  success: true;
  message: string;
}
