import type { UserSettings } from "@petrel/shared";
import { HttpResponse, http } from "msw";
import {
	createMockAudioFile,
	createMockFile,
	createMockFolder,
	createMockImageFile,
	createMockSettings,
	createMockShare,
	createMockTranscodeJob,
	createMockUser,
	createMockVideoFile,
	resetCounters,
} from "./data";

const API_BASE = "/api";

export const handlers = [
	http.get(`${API_BASE}/auth/me`, () => {
		const user = createMockUser({ username: "testuser", role: "admin" });
		return HttpResponse.json({ data: user, error: null });
	}),

	http.post(`${API_BASE}/auth/login`, async ({ request }) => {
		const body = await request.json();
		if (typeof body !== "object" || body === null) {
			return HttpResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
		}
		const { username, password } = body as { username: string; password: string };

		if (username === "validuser" && password === "validpassword") {
			const user = createMockUser({ username: "validuser", role: "admin" });
			return HttpResponse.json({
				data: {
					accessToken: "valid-access-token",
					refreshToken: "valid-refresh-token",
					user,
				},
				error: null,
			});
		}

		if (username === "invaliduser") {
			return HttpResponse.json({ data: null, error: "Invalid credentials" }, { status: 401 });
		}

		return HttpResponse.json({ data: null, error: "Invalid credentials" }, { status: 401 });
	}),

	http.post(`${API_BASE}/auth/logout`, () => {
		return HttpResponse.json({ data: null, error: null });
	}),

	http.post(`${API_BASE}/auth/refresh`, () => {
		const user = createMockUser({ username: "refresheduser", role: "user" });
		return HttpResponse.json({
			data: {
				accessToken: "refreshed-access-token",
				refreshToken: "refreshed-refresh-token",
				user,
			},
			error: null,
		});
	}),

	http.get(`${API_BASE}/files`, ({ request }) => {
		const url = new URL(request.url);
		const search = url.searchParams.get("search");

		resetCounters();
		const folders = [createMockFolder({ name: "Videos" }), createMockFolder({ name: "Images" })];
		const files = [
			createMockVideoFile({ name: "video1.mp4" }),
			createMockAudioFile({ name: "audio1.mp3" }),
			createMockImageFile({ name: "image1.jpg" }),
		];

		if (search) {
			const term = search.toLowerCase();
			const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(term));
			const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(term));
			return HttpResponse.json({
				data: {
					files: filteredFiles,
					folders: filteredFolders,
					currentFolder: null,
					parentChain: [],
					pagination: {
						limit: 20,
						offset: 0,
						total: filteredFiles.length + filteredFolders.length,
					},
				},
				error: null,
			});
		}

		return HttpResponse.json({
			data: {
				files,
				folders,
				currentFolder: null,
				parentChain: [],
				pagination: {
					limit: 20,
					offset: 0,
					total: files.length + folders.length,
				},
			},
			error: null,
		});
	}),

	http.get(`${API_BASE}/files/:id`, ({ params }) => {
		const id = Number.parseInt(params.id as string, 10);
		if (Number.isNaN(id)) {
			return HttpResponse.json({ data: null, error: "Invalid file ID" }, { status: 400 });
		}
		const file = createMockFile({ id, name: `file${id}.mp4` });
		return HttpResponse.json({ data: file, error: null });
	}),

	http.post(`${API_BASE}/files/upload`, async ({ request }) => {
		const formData = await request.formData();
		const fileName = formData.get("fileName") as string;
		const size = Number.parseInt(formData.get("size") as string, 10);

		if (!fileName || Number.isNaN(size)) {
			return HttpResponse.json({ data: null, error: "Invalid upload data" }, { status: 400 });
		}

		if (size > 1024 * 1024 * 1024 * 5) {
			return HttpResponse.json({ data: null, error: "File too large" }, { status: 400 });
		}

		const file = createMockFile({ name: fileName, size });
		return HttpResponse.json({ data: file, error: null });
	}),

	http.delete(`${API_BASE}/files/:id`, () => {
		return HttpResponse.json({ data: null, error: null });
	}),

	http.patch(`${API_BASE}/files/:id`, async ({ request }) => {
		const body = await request.json();
		if (typeof body !== "object" || body === null) {
			return HttpResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
		}
		const { name } = body as { name?: string };
		const id = Number.parseInt(body.id as unknown as string, 10);

		if (name === "error") {
			return HttpResponse.json({ data: null, error: "Update failed" }, { status: 500 });
		}

		const file = createMockFile({ id, name: name || `file${id}.mp4` });
		return HttpResponse.json({ data: file, error: null });
	}),

	http.post(`${API_BASE}/folders`, async ({ request }) => {
		const body = await request.json();
		if (typeof body !== "object" || body === null) {
			return HttpResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
		}
		const { name } = body as { name: string };

		if (name === "error") {
			return HttpResponse.json({ data: null, error: "Create failed" }, { status: 500 });
		}

		const folder = createMockFolder({ name });
		return HttpResponse.json({ data: folder, error: null });
	}),

	http.patch(`${API_BASE}/folders/:id`, () => {
		return HttpResponse.json({ data: { id: 1 }, error: null });
	}),

	http.get(`${API_BASE}/shares`, () => {
		resetCounters();
		const file1 = createMockFile({ id: 1, name: "shared1.mp4" });
		const folder1 = createMockFolder({ id: 2, name: "shared-folder" });
		const share1 = createMockShare({ id: 1, type: "file", targetId: 1 });
		const share2 = createMockShare({ id: 2, type: "folder", targetId: 2 });

		return HttpResponse.json({
			data: [
				{
					share: share1,
					settings: { shareId: 1, allowDownload: true, allowZip: true, showMetadata: true },
					content: file1,
				},
				{
					share: share2,
					settings: { shareId: 2, allowDownload: true, allowZip: false, showMetadata: false },
					content: folder1,
				},
			],
			error: null,
		});
	}),

	http.post(`${API_BASE}/shares`, async ({ request }) => {
		const body = await request.json();
		if (typeof body !== "object" || body === null) {
			return HttpResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
		}
		const { type, targetId, expiresAt, password } = body as {
			type: "file" | "folder";
			targetId: number;
			expiresAt?: string;
			password?: string;
		};

		if (String(targetId) === "error") {
			return HttpResponse.json({ data: null, error: "Create share failed" }, { status: 500 });
		}

		const share = createMockShare({
			id: 1,
			type,
			targetId,
			expiresAt: expiresAt ? new Date(expiresAt) : null,
			hasPassword: Boolean(password),
		});
		const settings = { shareId: 1, allowDownload: true, allowZip: true, showMetadata: true };

		return HttpResponse.json({ data: { share, settings }, error: null });
	}),

	http.get(`${API_BASE}/shares/:token`, ({ params }) => {
		const token = params.token as string;

		if (token === "notfound") {
			return HttpResponse.json({ data: null, error: "Share not found" }, { status: 404 });
		}

		if (token === "expired") {
			return HttpResponse.json({ data: null, error: "Share has expired" }, { status: 403 });
		}

		if (token === "password") {
			return HttpResponse.json({ data: null, error: "Share requires password" }, { status: 401 });
		}

		resetCounters();
		const file = createMockFile({ id: 1, name: "shared.mp4" });
		const share = createMockShare({ id: 1, token, type: "file", targetId: 1 });
		const settings = { shareId: 1, allowDownload: true, allowZip: true, showMetadata: true };

		return HttpResponse.json({
			data: { share, settings, content: file },
			error: null,
		});
	}),

	http.patch(`${API_BASE}/shares/:id`, async ({ request, params }) => {
		const body = await request.json();
		if (typeof body !== "object" || body === null) {
			return HttpResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
		}
		const id = Number.parseInt(params.id as string, 10);
		const { expiresAt, password } = body as { expiresAt?: string; password?: string };

		const share = createMockShare({
			id,
			expiresAt: expiresAt ? new Date(expiresAt) : null,
			hasPassword: Boolean(password),
		});
		const settings = { shareId: id, allowDownload: true, allowZip: true, showMetadata: true };

		return HttpResponse.json({ data: { share, settings }, error: null });
	}),

	http.delete(`${API_BASE}/shares/:id`, () => {
		return HttpResponse.json({ data: null, error: null });
	}),

	http.post(`${API_BASE}/shares/:token/download-zip`, ({ params }) => {
		const token = params.token as string;
		return HttpResponse.json({
			data: { jobId: `zip-${token}`, status: "pending" },
			error: null,
		});
	}),

	http.get(`${API_BASE}/shares/:token/download-zip/:jobId`, ({ params }) => {
		const jobId = params.jobId as string;

		if (jobId === "error") {
			return HttpResponse.json({ data: null, error: "Zip generation failed" }, { status: 500 });
		}

		if (jobId.startsWith("pending")) {
			return HttpResponse.json({
				data: { jobId, status: "pending", progress: 30 },
				error: null,
			});
		}

		if (jobId.startsWith("complete")) {
			return HttpResponse.json({
				data: { jobId, status: "completed", progress: 100 },
				error: null,
			});
		}

		return HttpResponse.json({
			data: { jobId, status: "completed", progress: 100 },
			error: null,
		});
	}),

	http.get(`${API_BASE}/stream/:id/info`, ({ params }) => {
		const id = Number.parseInt(params.id as string, 10);
		const file = createMockTranscodeJob({ fileId: id, status: "completed", progress: 100 });

		return HttpResponse.json({
			data: {
				available: true,
				qualities: ["1080p", "720p", "480p"],
				isTransmux: false,
				needsTranscode: false,
				transcodeJob: file,
			},
			error: null,
		});
	}),

	http.get(`${API_BASE}/stream/share/:token/:fileId/info`, () => {
		return HttpResponse.json({
			data: {
				available: true,
				qualities: ["1080p", "720p"],
				isTransmux: true,
				needsTranscode: false,
				transcodeJob: null,
			},
			error: null,
		});
	}),

	http.get(`${API_BASE}/stream/:id/subtitles`, () => {
		return HttpResponse.json({
			data: [
				{ id: 1, language: "eng", title: "English" },
				{ id: 2, language: "spa", title: "Spanish" },
			],
			error: null,
		});
	}),

	http.get(`${API_BASE}/stream/:id/tracks`, () => {
		return HttpResponse.json({
			data: [
				{ index: 0, type: "video", codec: "h264", language: null, title: null },
				{ index: 1, type: "audio", codec: "aac", language: "eng", title: "English" },
			],
			error: null,
		});
	}),

	http.get(`${API_BASE}/stream/share/:token/:fileId/subtitles`, ({ request }) => {
		const url = new URL(request.url);
		const password = url.searchParams.get("password");
		// Return empty subtitles for tests, or add logic if needed
		return HttpResponse.json({
			data: password
				? [{ id: 1, language: "eng", title: "English (Protected)" }]
				: [{ id: 1, language: "eng", title: "English" }],
			error: null,
		});
	}),

	http.get(`${API_BASE}/stream/share/:token/:fileId/tracks`, ({ request }) => {
		const url = new URL(request.url);
		const password = url.searchParams.get("password");
		return HttpResponse.json({
			data: [
				{ index: 0, type: "video", codec: "h264", language: null, title: null },
				{
					index: 1,
					type: "audio",
					codec: "aac",
					language: "eng",
					title: password ? "English (Protected)" : "English",
				},
			],
			error: null,
		});
	}),

	http.post(`${API_BASE}/stream/:id/prepare`, () => {
		return HttpResponse.json({
			data: { ready: true, firstSegmentUrl: "/api/stream/1/segment0.ts" },
			error: null,
		});
	}),

	http.get(`${API_BASE}/settings`, () => {
		return HttpResponse.json({ data: createMockSettings(), error: null });
	}),

	http.patch(`${API_BASE}/settings`, async ({ request }) => {
		const updates = await request.json();
		const settings = createMockSettings(updates as Partial<UserSettings>);
		return HttpResponse.json({ data: settings, error: null });
	}),

	http.post(`${API_BASE}/settings/reset`, () => {
		return HttpResponse.json({ data: createMockSettings(), error: null });
	}),

	http.get(`${API_BASE}/settings/defaults`, () => {
		return HttpResponse.json({ data: createMockSettings(), error: null });
	}),

	http.get(`${API_BASE}/server-settings`, () => {
		return HttpResponse.json({ data: {}, error: null });
	}),

	http.patch(`${API_BASE}/server-settings`, async ({ request }) => {
		const updates = await request.json();
		return HttpResponse.json({ data: updates, error: null });
	}),

	http.post(`${API_BASE}/server-settings/reset`, () => {
		return HttpResponse.json({ data: {}, error: null });
	}),

	http.get(`${API_BASE}/setup/status`, () => {
		return HttpResponse.json({ data: { needsAdminSetup: false }, error: null });
	}),

	http.post(`${API_BASE}/setup/admin`, async ({ request }) => {
		const body = await request.json();
		if (typeof body !== "object" || body === null) {
			return HttpResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
		}
		const { username } = body as { username: string };

		return HttpResponse.json({
			data: { user: { id: 1, username, role: "admin" } },
			error: null,
		});
	}),
];

export const mswUnhandledRequestHandler = (req: Request, print: { warning: () => void }) => {
	if (req.url.includes("/mock-service-worker")) return;

	print.warning();
};
