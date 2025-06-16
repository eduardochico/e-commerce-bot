import { Body, Controller, Header, Post } from '@nestjs/common';
import { ShopifyService } from '../shopify/shopify.service';
import { OpenaiService } from '../openai/openai.service';
import { twiml } from 'twilio';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly openaiService: OpenaiService,
  ) {}

  @Post('webhook')
  @Header('Content-Type', 'text/xml')
  async handleMessage(@Body() body: any): Promise<string> {
    const from = body.From?.replace('whatsapp:', '') || '';
    const userMessage = body.Body || '';

    const products = await this.shopifyService.getProducts();
    const productNames = products.map((p: any) => p.productName).join(', ');

    const reply = await this.openaiService.chat([
      {
        role: 'system',
        content:
          'You are a helpful e-commerce assistant. ' +
          'There is an endpoint GET /products that returns available product names. ' +
          `Current products are: ${productNames}. Use this information when relevant.`,
      },
      { role: 'user', content: userMessage },
    ]);

    const twimlRes = new twiml.MessagingResponse();
    twimlRes.message(reply);


    console.log('From:', from);

    return twimlRes.toString();
  }
}
