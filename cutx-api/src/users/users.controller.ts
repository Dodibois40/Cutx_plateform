import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ClerkUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(ClerkAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() clerkUser: ClerkUser) {
    // Find or create user in our database
    const user = await this.usersService.findOrCreate({
      clerkId: clerkUser.clerkId,
      email: clerkUser.email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    });

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      company: user.company,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Put('me')
  async updateProfile(
    @CurrentUser() clerkUser: ClerkUser,
    @Body() updateData: { phone?: string; company?: string },
  ) {
    const user = await this.usersService.findByClerkId(clerkUser.clerkId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.usersService.update(clerkUser.clerkId, updateData);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      company: updatedUser.company,
    };
  }
}
