import type { ShareWithSettings } from "../services/share.service";
import { shareService } from "../services/share.service";

export interface ShareAccessResult {
	share: ShareWithSettings | null;
	error: string | null;
	status: number;
}

export async function validateShareAccess(
	token: string,
	password?: string,
): Promise<ShareAccessResult> {
	const share = await shareService.getShareByToken(token);
	if (!share) {
		return { share: null, error: "Share not found", status: 404 };
	}

	if (share.share.expiresAt && new Date(share.share.expiresAt) < new Date()) {
		return { share: null, error: "Share expired", status: 410 };
	}

	if (share.share.passwordHash) {
		const valid = await shareService.verifySharePassword(share.share, password ?? "");
		if (!valid) {
			return { share: null, error: "Invalid password", status: 401 };
		}
	}

	return { share, error: null, status: 200 };
}

export function setShareValidationError<_T>(
	set: { status?: number },
	result: { error: string | null; status: number },
): { data: null; error: string } | null {
	if (result.error) {
		set.status = result.status;
		return { data: null, error: result.error };
	}
	return null;
}
