import { Elysia } from 'elysia';
import type { User as SharedUser, UserRole } from '@petrel/shared';

export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
  [key: string]: string | number;
}

export interface RefreshPayload {
  userId: number;
  type: 'refresh';
  [key: string]: string | number;
}

export type User = SharedUser;

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

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
