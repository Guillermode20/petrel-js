import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

import { db } from './db';

const app = new Elysia()
  .use(swagger())
  .use(
    cors({
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    })
  )
  .get('/', () => ({
    message: 'Hello World from Elysia Backend!',
  }))
  .get('/api/hello', () => ({
    message: 'Hello World from Elysia Backend!',
    timestamp: new Date().toISOString(),
  }))
  .listen(4000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);