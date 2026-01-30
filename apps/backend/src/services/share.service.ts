import { eq, sql, inArray } from 'drizzle-orm';
import type { File, Folder, Share, ShareSettings, ShareType } from '@petrel/shared';
import { db } from '../../db';
import { shareSettings, shares } from '../../db/schema';
import { generateSecureToken, hashPassword, verifyPassword } from '../modules/auth/utils';
import { fileService } from './file.service';
import { folderService } from './folder.service';

export interface CreateShareInput {
  type: ShareType;
  targetId: number;
  expiresAt: Date | null;
  password: string | null;
  allowDownload: boolean;
  allowZip: boolean;
  showMetadata: boolean;
  createdBy: number | null;
}

export interface ShareWithSettings {
  share: Share;
  settings: ShareSettings;
}

export interface ShareWithContent extends ShareWithSettings {
  content: File | Folder | null;
}

export interface UpdateShareInput {
  expiresAt?: Date | null;
  password?: string | null;
  allowDownload?: boolean;
  allowZip?: boolean;
  showMetadata?: boolean;
}

export class ShareService {
  private mapShare(row: typeof shares.$inferSelect): Share {
    return {
      id: row.id,
      type: row.type as ShareType,
      targetId: row.targetId,
      token: row.token,
      expiresAt: row.expiresAt,
      passwordHash: row.passwordHash,
      hasPassword: Boolean(row.passwordHash),
      downloadCount: row.downloadCount,
      viewCount: row.viewCount,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt ?? null,
    };
  }

  private mapSettings(row: typeof shareSettings.$inferSelect): ShareSettings {
    return {
      shareId: row.shareId,
      allowDownload: row.allowDownload,
      allowZip: row.allowZip,
      showMetadata: row.showMetadata,
    };
  }

  private async generateUniqueToken(): Promise<string> {
    let token = generateSecureToken(24);
    let existing = await db.query.shares.findFirst({ where: eq(shares.token, token) });

    while (existing) {
      token = generateSecureToken(24);
      existing = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    }

    return token;
  }

  async createShare(input: CreateShareInput): Promise<ShareWithSettings> {
    const token = await this.generateUniqueToken();
    const passwordHash = input.password ? await hashPassword(input.password) : null;

    const insertedShare = await db
      .insert(shares)
      .values({
        type: input.type,
        targetId: input.targetId,
        token,
        expiresAt: input.expiresAt,
        passwordHash,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    const createdShare = insertedShare[0];
    if (!createdShare) {
      throw new Error('Failed to create share');
    }

    const insertedSettings = await db
      .insert(shareSettings)
      .values({
        shareId: createdShare.id,
        allowDownload: input.allowDownload,
        allowZip: input.allowZip,
        showMetadata: input.showMetadata,
      })
      .returning();

    const createdSettings = insertedSettings[0];
    if (!createdSettings) {
      throw new Error('Failed to create share settings');
    }

    return {
      share: this.mapShare(createdShare),
      settings: this.mapSettings(createdSettings),
    };
  }

  async getShareByToken(token: string): Promise<ShareWithSettings | null> {
    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return null;

    const settings = await db.query.shareSettings.findFirst({
      where: eq(shareSettings.shareId, share.id),
    });

    if (!settings) return null;

    return { share: this.mapShare(share), settings: this.mapSettings(settings) };
  }

  async verifySharePassword(share: Share, password: string): Promise<boolean> {
    if (!share.passwordHash) return true;
    return await verifyPassword(password, share.passwordHash);
  }

  async incrementViewCount(shareId: number): Promise<void> {
    await db
      .update(shares)
      .set({ viewCount: sql`${shares.viewCount} + 1` })
      .where(eq(shares.id, shareId));
  }

  async listByUser(userId: number): Promise<ShareWithSettings[]> {
    const rows = await db.query.shares.findMany({ where: eq(shares.createdBy, userId) });
    if (rows.length === 0) return [];

    const settingsMap = new Map<number, ShareSettings>();
    const ids = rows.map((r) => r.id);
    const settingsRows = await db.query.shareSettings
      .findMany({
        where: ids.length ? inArray(shareSettings.shareId, ids) : undefined,
      })
      .catch(() => [] as typeof shareSettings.$inferSelect[]);

    settingsRows.forEach((row) => settingsMap.set(row.shareId, this.mapSettings(row)));

    return rows.map((row) => ({
      share: this.mapShare(row),
      settings: settingsMap.get(row.id) ?? {
        shareId: row.id,
        allowDownload: true,
        allowZip: false,
        showMetadata: true,
      },
    }));
  }

  async getShareContent(share: Share): Promise<File | Folder | null> {
    if (share.type === 'file') {
      return await fileService.getById(share.targetId);
    }

    if (share.type === 'folder') {
      return await folderService.getById(share.targetId);
    }

    return null;
  }

  async deleteShare(shareId: number): Promise<void> {
    await db.delete(shareSettings).where(eq(shareSettings.shareId, shareId));
    await db.delete(shares).where(eq(shares.id, shareId));
  }

  async updateShare(shareId: number, input: UpdateShareInput): Promise<ShareWithSettings | null> {
    const existing = await db.query.shares.findFirst({ where: eq(shares.id, shareId) });
    if (!existing) return null;

    const passwordHash = input.password === undefined
      ? existing.passwordHash
      : input.password === null
        ? null
        : await hashPassword(input.password);

    const updatedShares = await db
      .update(shares)
      .set({
        expiresAt: input.expiresAt ?? existing.expiresAt,
        passwordHash,
      })
      .where(eq(shares.id, shareId))
      .returning();

    const updatedShare = updatedShares[0];
    if (!updatedShare) return null;

    const settingsUpdates: Partial<typeof shareSettings.$inferInsert> = {};
    if (input.allowDownload !== undefined) settingsUpdates.allowDownload = input.allowDownload;
    if (input.allowZip !== undefined) settingsUpdates.allowZip = input.allowZip;
    if (input.showMetadata !== undefined) settingsUpdates.showMetadata = input.showMetadata;

    const updatedSettings = Object.keys(settingsUpdates).length
      ? await db
          .update(shareSettings)
          .set(settingsUpdates)
          .where(eq(shareSettings.shareId, shareId))
          .returning()
      : await db.query.shareSettings.findMany({
          where: eq(shareSettings.shareId, shareId),
        });

    const updatedSetting = updatedSettings[0];
    if (!updatedSetting) return null;

    return {
      share: this.mapShare(updatedShare),
      settings: this.mapSettings(updatedSetting),
    };
  }
}

export const shareService = new ShareService();