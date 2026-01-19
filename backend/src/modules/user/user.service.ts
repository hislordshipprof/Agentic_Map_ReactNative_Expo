import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateByEmail(email: string): Promise<{ id: string }> {
    let u = await this.prisma.user.findUnique({ where: { email } });
    if (!u) {
      u = await this.prisma.user.create({ data: { email } });
    }
    return { id: u.id };
  }

  async getProfile(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) return null;
    const prefs = (u.preferences as Record<string, unknown>) ?? {};
    return {
      id: u.id,
      email: u.email ?? undefined,
      displayName: (prefs.displayName as string) ?? undefined,
      isAnonymous: !u.email,
      createdAt: u.createdAt.toISOString(),
      lastActiveAt: u.updatedAt.toISOString(),
    };
  }

  async getPreferences(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
    return (u?.preferences as Record<string, unknown>) ?? {};
  }

  async updatePreferences(userId: string, prefs: Record<string, unknown>) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) return null;
    const next = { ...((u.preferences as Record<string, unknown>) ?? {}), ...prefs } as object;
    await this.prisma.user.update({ where: { id: userId }, data: { preferences: next } });
    return next;
  }

  async getHistory(userId: string, limit = 20, offset = 0) {
    const rows = await this.prisma.conversationHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });
    const total = await this.prisma.conversationHistory.count({ where: { userId } });
    const conversations = rows.map((r) => ({
      id: r.id,
      utterance: r.userMessage,
      response: r.systemResponse ?? '',
      timestamp: r.timestamp.toISOString(),
    }));
    return { conversations, total };
  }

  async clearHistory(userId: string) {
    await this.prisma.conversationHistory.deleteMany({ where: { userId } });
  }
}
