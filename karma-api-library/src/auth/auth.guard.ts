import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Debes iniciar sesión.');
    const auth = await this.auth.authenticate(header.slice(7));
    request.account = auth.account;
    request.reader = auth.reader;
    request.sessionId = auth.sessionId;
    return true;
  }
}
