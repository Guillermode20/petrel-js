# E2E Tests

End-to-end tests for Petrel using Playwright with Page Object Models.

## Test Credentials

- **Username:** `admin`
- **Password:** `admin123`

## Architecture

```
apps/e2e/
├── fixtures/           # Playwright fixtures & test data
│   ├── setup.ts        # Extended test fixtures (apiClient, POMs, authenticatedPage)
│   ├── api-client.ts   # Backend API client for setup operations
│   └── test-data.ts    # Shared test constants
├── pages/              # Page Object Models
│   ├── login.page.ts   # Login form interactions
│   ├── file-browser.page.ts  # File grid, upload, context menu, folders
│   ├── share-dialog.page.ts  # Share link creation
│   └── index.ts        # Barrel exports
├── tests/              # Test specs
│   ├── auth.spec.ts
│   ├── files.spec.ts
│   ├── folders.spec.ts
│   └── shares.spec.ts
├── global-setup.ts     # Cleans test DB before runs
└── playwright.config.ts
```

### Fixtures

Tests import `{ test, expect }` from `../fixtures/setup` which provides:
- **`loginPage`** — `LoginPage` POM instance
- **`fileBrowser`** — `FileBrowserPage` POM instance
- **`shareDialog`** — `ShareDialog` POM instance
- **`apiClient`** — Direct backend API client
- **`authenticatedPage`** — Logs in via UI automatically (use in `beforeEach`)

### Using authenticatedPage

For tests that need a logged-in session:

```ts
test.beforeEach(async ({ authenticatedPage }) => {
  // Login is handled automatically by the fixture
});

test("my test", async ({ fileBrowser }) => {
  await fileBrowser.uploadFile("test.txt", "text/plain", "content");
});
```

## Running Tests

### Automatic Server Startup (Recommended)

```bash
bun run test:e2e
```

### Manual Server Startup

**Terminal 1 — Backend:**
```powershell
cd apps/backend
bun --env-file=.env.e2e run dev
```

**Terminal 2 — Frontend:**
```powershell
cd apps/frontend
bun run dev
```

**Terminal 3 — Tests:**
```powershell
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

- **Rate limiting errors:** Ensure backend started with `--env-file=.env.e2e`
- **Login failures:** Delete `apps/backend/test-e2e.db` for clean state, restart backend
- **UI elements not found:** Check screenshots in `test-results/` folder
