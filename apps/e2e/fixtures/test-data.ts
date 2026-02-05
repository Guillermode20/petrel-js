/**
 * Test data fixtures for E2E tests
 */

export const TEST_USERS = {
  admin: {
    username: "admin",
    password: "admin123",
    role: "admin" as const,
  },
  user: {
    username: "e2e-user",
    password: "E2EUserPass123!",
    role: "user" as const,
  },
};

export const TEST_FILES = {
  text: {
    name: "test-file.txt",
    content: "Hello, this is a test file for Petrel E2E tests!",
    mimeType: "text/plain",
  },
  image: {
    name: "test-image.png",
    // Minimal 1x1 PNG
    content: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
    mimeType: "image/png",
  },
};

export const TEST_FOLDERS = {
  documents: {
    name: "E2E Documents",
  },
  media: {
    name: "E2E Media",
  },
};
