import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { CreateAnchorDto, UpdateAnchorDto } from '../dtos/anchor.dto';
import { AnchorService } from '../anchor.service';
import { UserService } from '../user.service';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly user: UserService,
    private readonly anchor: AnchorService,
  ) {}

  private async getUserId(req: Request & { user?: { sub: string } }): Promise<string> {
    const sub = req.user?.sub ?? (req.headers['x-user-id'] as string) ?? 'dev@local';
    const { id } = await this.user.getOrCreateByEmail(sub);
    return id;
  }

  @Get('profile')
  async getProfile(@Req() req: Request & { user?: { sub: string } }) {
    const userId = await this.getUserId(req);
    const p = await this.user.getProfile(userId);
    if (!p) throw new HttpException({ error: { code: 'NOT_FOUND', message: 'User not found' } }, HttpStatus.NOT_FOUND);
    return p;
  }

  @Get('preferences')
  async getPreferences(@Req() req: Request & { user?: { sub: string } }) {
    const userId = await this.getUserId(req);
    return this.user.getPreferences(userId);
  }

  @Patch('preferences')
  async updatePreferences(
    @Req() req: Request & { user?: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const userId = await this.getUserId(req);
    const p = await this.user.updatePreferences(userId, body);
    if (!p) throw new HttpException({ error: { code: 'NOT_FOUND', message: 'User not found' } }, HttpStatus.NOT_FOUND);
    return { preferences: p };
  }

  @Get('history')
  async getHistory(
    @Req() req: Request & { user?: { sub: string } },
    @Query('limit') limitStr: string | undefined,
    @Query('offset') offsetStr: string | undefined,
  ) {
    const userId = await this.getUserId(req);
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    return this.user.getHistory(userId, limit, offset);
  }

  @Delete('history')
  async clearHistory(@Req() req: Request & { user?: { sub: string } }) {
    const userId = await this.getUserId(req);
    await this.user.clearHistory(userId);
    return {};
  }

  @Get('anchors')
  async getAnchors(@Req() req: Request & { user?: { sub: string } }) {
    const userId = await this.getUserId(req);
    const list = await this.anchor.list(userId);
    return { anchors: list };
  }

  @Post('anchors')
  async createAnchor(
    @Req() req: Request & { user?: { sub: string } },
    @Body() dto: CreateAnchorDto,
  ) {
    const userId = await this.getUserId(req);
    return this.anchor.create(userId, dto);
  }

  @Put('anchors/:id')
  async updateAnchor(
    @Req() req: Request & { user?: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateAnchorDto,
  ) {
    const userId = await this.getUserId(req);
    const a = await this.anchor.update(id, userId, dto);
    if (!a) throw new HttpException({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } }, HttpStatus.NOT_FOUND);
    return a;
  }

  @Delete('anchors/:id')
  async deleteAnchor(
    @Req() req: Request & { user?: { sub: string } },
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(req);
    const ok = await this.anchor.delete(id, userId);
    if (!ok) throw new HttpException({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } }, HttpStatus.NOT_FOUND);
    return {};
  }
}
