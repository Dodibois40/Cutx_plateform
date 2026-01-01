import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UserData {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async handleUserCreated(data: UserData) {
    this.logger.log(`Creating user: ${data.email}`);

    return this.prisma.user.create({
      data: {
        clerkId: data.clerkId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });
  }

  async handleUserUpdated(data: UserData) {
    this.logger.log(`Updating user: ${data.email}`);

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { clerkId: data.clerkId },
    });

    if (!existingUser) {
      // User doesn't exist, create them
      return this.handleUserCreated(data);
    }

    return this.prisma.user.update({
      where: { clerkId: data.clerkId },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });
  }

  async handleUserDeleted(clerkId: string) {
    this.logger.log(`Deleting user: ${clerkId}`);

    // Check if user exists before deleting
    const existingUser = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!existingUser) {
      this.logger.warn(`User ${clerkId} not found, skipping deletion`);
      return null;
    }

    return this.prisma.user.delete({
      where: { clerkId },
    });
  }
}
