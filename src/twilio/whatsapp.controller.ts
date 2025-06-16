import { Body, Controller, Header, Post } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { ShopifyService } from '../shopify/shopify.service';
import { twiml } from 'twilio';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly twilioService: TwilioService,
    private readonly shopifyService: ShopifyService,
  ) {}

  @Post('webhook')
  @Header('Content-Type', 'text/xml')
  async handleMessage(@Body() body: any): Promise<string> {
    const incoming = (body.Body || '').toLowerCase();
    const from = body.From?.replace('whatsapp:', '') || '';
    if (incoming.includes('product')) {
      const products = await this.shopifyService.getProducts();
      const names = products.map((p: any) => p.productName).join(', ');
      const twimlRes = new twiml.MessagingResponse();
      twimlRes.message(`Available products: ${names}`);
      // Also send a message via API in case TwiML not delivered
      console.log('From:', from);
      try {
        await this.twilioService.sendWhatsAppMessage(
          from,
          `Available products: ${names}`,
        );
      } catch (error) {
        console.error('Failed to send proactive WhatsApp message', error);
      }
      return twimlRes.toString();
    }
    const twimlRes = new twiml.MessagingResponse();
    twimlRes.message('Send "products" to get a list of products.');
    return twimlRes.toString();
  }
}
