import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { handlers, mswUnhandledRequestHandler } from "./mocks/handlers";

if (typeof window !== "undefined") {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

if (typeof IntersectionObserver !== "undefined") {
	vi.stubGlobal(
		"IntersectionObserver",
		vi.fn().mockImplementation(() => ({
			observe: vi.fn(),
			unobserve: vi.fn(),
			disconnect: vi.fn(),
		})),
	);
}

class MockResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

const server = setupServer(...handlers);

beforeAll(() => {
	server.listen({
		onUnhandledRequest: mswUnhandledRequestHandler,
	});
});

afterEach(() => {
	cleanup();
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});

export { server };
