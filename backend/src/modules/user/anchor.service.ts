import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Coordinates } from '../../common/types';

export interface CreateAnchorInput {
  name: string;
  location: Coordinates;
  address?: string;
  type?: string;
}

@Injectable()
export class AnchorService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<Array<{ id: string; name: string; location: Coordinates; address?: string; type: string }>> {
    const rows = await this.prisma.anchor.findMany({ where: { userId }, orderBy: { name: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      location: { lat: r.latitude, lng: r.longitude },
      address: r.address ?? undefined,
      type: r.type,
    }));
  }

  async create(userId: string, dto: CreateAnchorInput) {
    const a = await this.prisma.anchor.create({
      data: {
        userId,
        name: dto.name,
        latitude: dto.location.lat,
        longitude: dto.location.lng,
        address: dto.address,
        type: dto.type ?? 'anchor',
      },
    });
    return { id: a.id, name: a.name, location: { lat: a.latitude, lng: a.longitude }, address: a.address ?? undefined, type: a.type };
  }

  async update(anchorId: string, userId: string, dto: Partial<CreateAnchorInput>) {
    const a = await this.prisma.anchor.updateMany({
      where: { id: anchorId, userId },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.location != null && { latitude: dto.location.lat, longitude: dto.location.lng }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.type != null && { type: dto.type }),
      },
    });
    if (a.count === 0) return null;
    const updated = await this.prisma.anchor.findUnique({ where: { id: anchorId } });
    return updated
      ? { id: updated.id, name: updated.name, location: { lat: updated.latitude, lng: updated.longitude }, address: updated.address ?? undefined, type: updated.type }
      : null;
  }

  async delete(anchorId: string, userId: string): Promise<boolean> {
    const r = await this.prisma.anchor.deleteMany({ where: { id: anchorId, userId } });
    return r.count > 0;
  }
}
