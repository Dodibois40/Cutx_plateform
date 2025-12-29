import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ClerkUser {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof ClerkUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ClerkUser;

    if (!user) return null;
    if (data) return user[data];
    return user;
  },
);
