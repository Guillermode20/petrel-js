# E2E Tests

End-to-end tests for Petrel using Playwright.

## Test Credentials

For both manual testing and automated tests:
- **Username:** `admin`
- **Password:** `admin123`

## Running Tests

### Option 1: Automatic Server Startup (Recommended)

Run tests with automatic server management:

```bash
bun run test:e2e
```

### Option 2: Manual Server Startup

If automatic startup has issues, start servers manually:

**Terminal 1 - Backend:**
```bash
cd apps/backend
bun --env-file=.env.e2e run dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
bun run dev
```

**Terminal 3 - Tests:**
```bash
cd apps/e2e
$env:SKIP_WEBSERVER="true"
bun run test
```

## Configuration

- Backend uses `.env.e2e` for E2E test configuration
- `E2E_MODE=true` disables rate limiting for tests
- Test database: `apps/backend/test-e2e.db`
- Global setup cleans database before tests

## Troubleshooting

**Rate limiting errors:**
- Ensure backend started with `--env-file=.env.e2e`
- Check `E2E_MODE=true` in `.env.e2e`

**Login failures:**
- Delete `apps/backend/test-e2e.db` for clean state
- Restart backend server

**UI elements not found:**
- Tests now include `waitForLoadState("networkidle")` after login
- Check browser screenshots in `test-results/` folder
