import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByClerkId(clerkId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { clerkId },
      include: { organization: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOrCreate(data: {
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    const existingUser = await this.findByClerkId(data.clerkId);
    if (existingUser) {
      return existingUser;
    }

    return this.prisma.user.create({
      data: {
        clerkId: data.clerkId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
  }

  async update(clerkId: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { clerkId },
      data,
    });
  }

  async delete(clerkId: string): Promise<User> {
    return this.prisma.user.delete({
      where: { clerkId },
    });
  }
}
