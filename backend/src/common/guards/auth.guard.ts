import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: { sub: string } }>();
    const secret = this.config.get<string>('JWT_SECRET');
    const auth = req.headers.authorization;

    if (!secret) {
      (req as Request & { user: { sub: string } }).user = { sub: (req.headers['x-user-id'] as string) || 'dev@local' };
      return true;
    }

    if (!auth?.startsWith('Bearer ')) {
      throw new HttpException(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const payload = jwt.verify(auth.slice(7), secret) as { sub?: string };
      (req as Request & { user: { sub: string } }).user = { sub: payload.sub ?? 'dev@local' };
      return true;
    } catch {
      throw new HttpException(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
