import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AccessLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: any }>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, user } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip || request.connection.remoteAddress || 'unknown';

    const now = Date.now();

    // Log de l'accès entrant
    this.logger.log(
      `[${method}] ${url} - User: ${user?.email || 'Anonymous'} (${user?.role || 'N/A'}) - IP: ${ip} - UserAgent: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          this.logger.log(
            `[${method}] ${url} - ${response.statusCode} - ${duration}ms - User: ${user?.email || 'Anonymous'} - Success`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `[${method}] ${url} - ${error.status || 500} - ${duration}ms - User: ${user?.email || 'Anonymous'} - Error: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
