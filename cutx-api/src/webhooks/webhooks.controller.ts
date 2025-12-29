import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from 'svix';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string | null;
    last_name: string | null;
    phone_numbers: Array<{ phone_number: string }>;
  };
  type: string;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly configService: ConfigService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Post('clerk')
  async handleClerkWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured');
      throw new HttpException(
        'Webhook secret not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const payload = req.rawBody?.toString() || '';

    // Verify webhook signature
    const wh = new Webhook(webhookSecret);
    let event: ClerkUserEvent;

    try {
      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkUserEvent;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      throw new HttpException('Invalid signature', HttpStatus.BAD_REQUEST);
    }

    // Handle different event types
    const { type, data } = event;
    console.log(`Received Clerk webhook: ${type}`);

    try {
      switch (type) {
        case 'user.created':
          await this.webhooksService.handleUserCreated({
            clerkId: data.id,
            email: data.email_addresses[0]?.email_address,
            firstName: data.first_name,
            lastName: data.last_name,
            phone: data.phone_numbers[0]?.phone_number,
          });
          break;

        case 'user.updated':
          await this.webhooksService.handleUserUpdated({
            clerkId: data.id,
            email: data.email_addresses[0]?.email_address,
            firstName: data.first_name,
            lastName: data.last_name,
            phone: data.phone_numbers[0]?.phone_number,
          });
          break;

        case 'user.deleted':
          await this.webhooksService.handleUserDeleted(data.id);
          break;

        default:
          console.log(`Unhandled event type: ${type}`);
      }

      return { received: true };
    } catch (error) {
      console.error(`Error handling webhook ${type}:`, error);
      throw new HttpException(
        'Error processing webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
