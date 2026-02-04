import { fileURLToPath, URL } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			routeFileIgnorePattern: "test/.*",
		}),
		viteReact(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@petrel/shared": fileURLToPath(new URL("../shared/src", import.meta.url)),
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./tests/setup.ts"],
		include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}", "tests/**/*.{test,spec}.{js,jsx,ts,tsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules/", "tests/", "src/index.css", "src/main.tsx", "**/*.stories.tsx"],
		},
		deps: {
			inline: ["@testing-library/jest-dom"],
		},
	},
});
