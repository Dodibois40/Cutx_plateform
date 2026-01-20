import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // Verify the session token with Clerk
      // Try both ConfigService and process.env
      const secretKeyFromConfig = this.configService.get<string>('CLERK_SECRET_KEY') || '';
      const secretKeyFromEnv = process.env.CLERK_SECRET_KEY || '';
      const secretKey = secretKeyFromConfig || secretKeyFromEnv;

      console.log('[ClerkAuthGuard] Token received, length:', token.length);
      console.log('[ClerkAuthGuard] Secret key from ConfigService:', !!secretKeyFromConfig, secretKeyFromConfig.substring(0, 15));
      console.log('[ClerkAuthGuard] Secret key from process.env:', !!secretKeyFromEnv, secretKeyFromEnv.substring(0, 15));

      const payload = await verifyToken(token, {
        secretKey,
        authorizedParties: ['http://localhost:3000', 'https://cutx.fr', 'https://www.cutx.fr'],
      });

      console.log('[ClerkAuthGuard] Token verified, user:', payload.sub);

      // Attach user info to request
      request.user = {
        clerkId: payload.sub,
        email: (payload.email as string) || '',
        firstName: payload.first_name as string,
        lastName: payload.last_name as string,
      };

      return true;
    } catch (error) {
      console.error('[ClerkAuthGuard] Token verification failed:', error.message, error.code);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
