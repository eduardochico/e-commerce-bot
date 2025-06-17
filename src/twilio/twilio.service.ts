import { Injectable } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private client: Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.client = new Twilio(accountSid, authToken);
  }

  async sendWhatsAppMessage(
    to: string,
    body: string,
    options?: { mediaUrl?: string; actionUrl?: string },
  ) {
    const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const payload: Record<string, any> = {
      from,
      to: `whatsapp:${to}`,
      body,
    };

    if (options?.mediaUrl) {
      payload.mediaUrl = [options.mediaUrl];
    }

    if (options?.actionUrl) {
      payload.persistentAction = [`${options.actionUrl}|Ver Producto`];
    }

    console.log('Sending WhatsApp', payload);
    return this.client.messages.create(payload as any);
  }
}
