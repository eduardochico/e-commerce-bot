import { Body, Controller, Header, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { twiml } from 'twilio';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
  ) {}

  @Post('webhook')
  @Header('Content-Type', 'text/xml')
  async handleMessage(@Body() body: any): Promise<string> {
    const from = body.From?.replace('whatsapp:', '') || '';
    const userMessage = body.Body || '';

    const { body: reply, mediaUrl } = await this.whatsappService.processMessage(
      userMessage,
    );

    const twimlRes = new twiml.MessagingResponse();

    const msg = twimlRes.message(reply);
    if (mediaUrl) {
      msg.media(mediaUrl);
    }


    console.log('From:', from);

    // Twilio automatically sends the message specified in the TwiML response.
    // Avoid proactively sending the same message again to prevent duplicates.

    return twimlRes.toString();
  }
}
