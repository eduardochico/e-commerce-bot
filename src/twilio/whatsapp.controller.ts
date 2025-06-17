import { Body, Controller, Header, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { TwilioService } from './twilio.service';
import { twiml } from 'twilio';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly twilioService: TwilioService,
  ) {}

  @Post('webhook')
  @Header('Content-Type', 'text/xml')
  async handleMessage(@Body() body: any): Promise<string> {
    const from = body.From?.replace('whatsapp:', '') || '';
    const userMessage = body.Body || '';

    const { body: reply, mediaUrl, actionUrl } =
      await this.whatsappService.processMessage(userMessage);

    if (actionUrl) {
      await this.twilioService.sendWhatsAppMessage(from, reply, {
        mediaUrl,
        actionUrl,
      });
      // Return empty TwiML so Twilio does not send an additional message
      return new twiml.MessagingResponse().toString();
    }
    const twimlRes = new twiml.MessagingResponse();
    const msg = twimlRes.message(reply);

    if (mediaUrl) {
      msg.media(mediaUrl);
    }
    return twimlRes.toString();
  }
}
