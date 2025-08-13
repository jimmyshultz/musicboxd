import { DiaryEntry } from '../types';
import { AlbumService } from './albumService';

// Utility helpers
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toISODateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthKey(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  return dateStr.slice(0, 7); // YYYY-MM
}

export class DiaryService {
  private static entries: DiaryEntry[] = [
    // Some demo entries for current user
    {
      id: 'diary_demo_1',
      userId: 'current-user-id',
      albumId: '1',
      diaryDate: toISODateOnly(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
      ratingAtTime: 5,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'diary_demo_2',
      userId: 'current-user-id',
      albumId: '3',
      diaryDate: toISODateOnly(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
      ratingAtTime: 4,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Demo entries for other users
    {
      id: 'diary_user1_1',
      userId: 'user1',
      albumId: '2',
      diaryDate: toISODateOnly(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
      ratingAtTime: 4,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'diary_user2_1',
      userId: 'user2',
      albumId: '5',
      diaryDate: toISODateOnly(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
      ratingAtTime: 5,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'diary_user3_1',
      userId: 'user3',
      albumId: '7',
      diaryDate: toISODateOnly(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
      ratingAtTime: 4,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  static async getDiaryEntryById(entryId: string): Promise<DiaryEntry | null> {
    await delay(200);
    return this.entries.find(e => e.id === entryId) || null;
    }

  // Pagination: returns entries for a user, sorted desc by diaryDate and createdAt, limited by months window
  // params: { startAfterMonth?: 'YYYY-MM', monthWindow?: number }
  static async getDiaryEntriesByUser(
    userId: string,
    params: { startAfterMonth?: string; monthWindow?: number } = {}
  ): Promise<{ entries: DiaryEntry[]; lastMonth?: string; hasMore: boolean }> {
    await delay(400);

    const monthWindow = params.monthWindow ?? 3;
    const all = this.entries
      .filter(e => e.userId === userId)
      .sort((a, b) => {
        if (a.diaryDate === b.diaryDate) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return b.diaryDate.localeCompare(a.diaryDate);
      });

    // Determine starting index based on startAfterMonth
    let startIndex = 0;
    if (params.startAfterMonth) {
      const idx = all.findIndex(e => getMonthKey(e.diaryDate) === params.startAfterMonth);
      if (idx !== -1) {
        // move past last occurrence of that month
        const targetMonth = params.startAfterMonth;
        let i = idx;
        while (i < all.length && getMonthKey(all[i].diaryDate) === targetMonth) i++;
        startIndex = i;
      }
    }

    // Collect entries up to monthWindow months
    const result: DiaryEntry[] = [];
    const seenMonths: Set<string> = new Set();
    let lastMonth: string | undefined;

    for (let i = startIndex; i < all.length; i++) {
      const entry = all[i];
      const monthKey = getMonthKey(entry.diaryDate);
      if (!seenMonths.has(monthKey) && seenMonths.size >= monthWindow) {
        break;
      }
      seenMonths.add(monthKey);
      result.push(entry);
      lastMonth = monthKey;
    }

    const hasMore = lastMonth ? all.some(e => getMonthKey(e.diaryDate) < lastMonth!) : false;

    return { entries: result, lastMonth, hasMore };
  }

  static async createDiaryEntry(
    userId: string,
    albumId: string,
    diaryDate: string,
    ratingAtTime?: number
  ): Promise<{ success: boolean; entry?: DiaryEntry; message?: string }> {
    await delay(300);

    // Enforce one per user+album+diaryDate
    const duplicate = this.entries.find(
      e => e.userId === userId && e.albumId === albumId && e.diaryDate === diaryDate
    );
    if (duplicate) {
      return { success: false, message: 'You already logged this album for that date.' };
    }

    const now = new Date().toISOString();
    const entry: DiaryEntry = {
      id: `diary_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      albumId,
      diaryDate,
      ratingAtTime,
      createdAt: now,
      updatedAt: now,
    };

    this.entries.unshift(entry);

    // Ensure album is marked as listened
    await AlbumService.addListened(userId, albumId);

    return { success: true, entry };
  }

  static async updateDiaryEntry(
    entryId: string,
    updates: { diaryDate?: string; ratingAtTime?: number }
  ): Promise<{ success: boolean; entry?: DiaryEntry; message?: string }> {
    await delay(300);

    const idx = this.entries.findIndex(e => e.id === entryId);
    if (idx === -1) return { success: false, message: 'Entry not found' };

    const current = this.entries[idx];

    // If changing date, enforce uniqueness
    if (updates.diaryDate && updates.diaryDate !== current.diaryDate) {
      const dupe = this.entries.find(
        e => e.userId === current.userId && e.albumId === current.albumId && e.diaryDate === updates.diaryDate
      );
      if (dupe) {
        return { success: false, message: 'You already logged this album for that date.' };
      }
    }

    const updated: DiaryEntry = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.entries[idx] = updated;
    return { success: true, entry: updated };
  }

  static async deleteDiaryEntry(entryId: string): Promise<{ success: boolean }> {
    await delay(200);
    const before = this.entries.length;
    this.entries = this.entries.filter(e => e.id !== entryId);
    return { success: this.entries.length < before };
  }
}