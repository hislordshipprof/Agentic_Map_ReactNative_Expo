import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    suggestions?: string[] | Array<{ action: string; label?: string }>;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorResponse['error'] = {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const o = res as Record<string, unknown>;
        const e = (o.error as Record<string, unknown> | undefined) ?? o;
        body = {
          code: (e.code as string) ?? `HTTP_${status}`,
          message: (e.message as string) ?? exception.message,
          details: (e.details as Record<string, unknown>) ?? (o.details as Record<string, unknown> | undefined),
          suggestions: (e.suggestions as ErrorResponse['error']['suggestions']) ?? (o.suggestions as ErrorResponse['error']['suggestions']),
        };
      } else {
        body.message = String(res);
        body.code = `HTTP_${status}`;
      }
    } else if (exception instanceof Error) {
      body.message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({ error: body });
  }
}
