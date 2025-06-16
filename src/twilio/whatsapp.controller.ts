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

    const raw = await this.shopifyService.getProducts();
    const products = (raw.products ?? []) as any[];
    const catalog = products.map((p: any) => ({
      productName: p.title,
      productId: p.id,
      handle: p.handle,
      imageUrl: p.image?.src ?? p.images?.[0]?.src ?? null,
      price: p.variants?.[0]?.price,
      vendor: p.vendor,
    }));
    const catalogInfo = catalog
      .map(
        (p: any) =>
          `${p.productName} (id: ${p.productId}, price: ${p.price}, vendor: ${p.vendor}, image: ${p.imageUrl})`,
      )
      .join('; ');

    const reply = await this.openaiService.chat([
      {
        role: 'system',
        content:
          'You are a helpful e-commerce assistant for an online store. ' +
          'Use the catalog information provided to answer customer questions. ' +
          'Do not mention internal API endpoints. ' +
          `Catalog info: ${catalogInfo}.`,
      },
      { role: 'user', content: userMessage },
    ]);

    const twimlRes = new twiml.MessagingResponse();

    const matchedProduct = catalog.find(
      (p: any) =>
        userMessage.toLowerCase().includes(p.productName.toLowerCase()) ||
        userMessage.includes(String(p.productId)),
    );

    let messageBody = reply;
    if (matchedProduct) {
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      const link =
        shopDomain && matchedProduct.handle
          ? `https://${shopDomain}/products/${matchedProduct.handle}`
          : '';
      messageBody = `${matchedProduct.productName} - $${matchedProduct.price}\nVendor: ${matchedProduct.vendor}`;
      if (link) {
        messageBody += `\nView online: ${link}`;
      }
    }

    const msg = twimlRes.message(messageBody);

    if (matchedProduct?.imageUrl) {
      msg.media(matchedProduct.imageUrl);
    }


    console.log('From:', from);

    // Twilio automatically sends the message specified in the TwiML response.
    // Avoid proactively sending the same message again to prevent duplicates.

    return twimlRes.toString();
  }
}
