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

  async sendWhatsAppMessage(to: string, body: string) {
    const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    console.log('Sending WhatsApp from', from, 'to', `whatsapp:${to}`);
    return this.client.messages.create({
      from,
      to: `whatsapp:${to}`,
      body,
    });
  }
}
