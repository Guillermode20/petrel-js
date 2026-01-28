import { eq, sql } from 'drizzle-orm';
import type { Share, ShareSettings, ShareType } from '@petrel/shared';
import { db } from '../../db';
import { shareSettings, shares } from '../../db/schema';
import { generateSecureToken, hashPassword, verifyPassword } from '../modules/auth/utils';

export interface CreateShareInput {
  type: ShareType;
  targetId: number;
  expiresAt: Date | null;
  password: string | null;
  allowDownload: boolean;
  allowZip: boolean;
  showMetadata: boolean;
}

export interface ShareWithSettings {
  share: Share;
  settings: ShareSettings;
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
      downloadCount: row.downloadCount,
      viewCount: row.viewCount,
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