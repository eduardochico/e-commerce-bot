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
    const catalogInfo = products
      .map(
        (p: any) =>
          `${p.productName} (id: ${p.productId}, price: ${p.price}, vendor: ${p.vendor}, image: ${p.imageUrl})`,
      )
      .join('; ');

    const reply = await this.openaiService.chat([
      {
        role: 'system',
        content:
          'You are a helpful e-commerce assistant. ' +
          'There is an endpoint GET /products that returns available product details. ' +
          `Catalog info: ${catalogInfo}. Use this information when relevant.`,
      },
      { role: 'user', content: userMessage },
    ]);

    const twimlRes = new twiml.MessagingResponse();
    const msg = twimlRes.message(reply);

    const matchedProduct = products.find(
      (p: any) =>
        userMessage.toLowerCase().includes(p.productName.toLowerCase()) ||
        userMessage.includes(String(p.productId)),
    );

    if (matchedProduct?.imageUrl) {
      msg.media(matchedProduct.imageUrl);
    }

    console.log('From:', from);

    // Twilio automatically sends the message specified in the TwiML response.
    // Avoid proactively sending the same message again to prevent duplicates.

    return twimlRes.toString();
  }
}
