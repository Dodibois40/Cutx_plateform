import { Injectable } from '@nestjs/common';
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
  constructor(private prisma: PrismaService) {}

  async handleUserCreated(data: UserData) {
    console.log(`Creating user: ${data.email}`);

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
    console.log(`Updating user: ${data.email}`);

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
    console.log(`Deleting user: ${clerkId}`);

    // Check if user exists before deleting
    const existingUser = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!existingUser) {
      console.log(`User ${clerkId} not found, skipping deletion`);
      return null;
    }

    return this.prisma.user.delete({
      where: { clerkId },
    });
  }
}
