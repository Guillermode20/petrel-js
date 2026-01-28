import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

import { db } from './db';
import { authRoutes, authMiddleware } from './src/modules/auth';

const app = new Elysia()
  .use(swagger())
  .use(
    cors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    })
  )
  // Health check endpoint
  .get('/', () => ({
    message: 'Hello World from Elysia Backend!',
  }))
  .get('/api/hello', () => ({
    message: 'Hello World from Elysia Backend!',
    timestamp: new Date().toISOString(),
  }))
  // Auth routes
  .use(authRoutes)
  .listen(4000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log(
  `📚 Swagger documentation at http://${app.server?.hostname}:${app.server?.port}/swagger`
);
