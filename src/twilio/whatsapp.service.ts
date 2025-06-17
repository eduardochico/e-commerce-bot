import { Injectable } from '@nestjs/common';
import { ShopifyService } from '../shopify/shopify.service';
import { OpenaiService, CatalogItem } from '../openai/openai.service';
import { MemoryService, UserData } from '../memory/memory.service';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly openaiService: OpenaiService,
    private readonly memoryService: MemoryService,
  ) {}

  private buildCatalog(raw: any[]): CatalogItem[] {
    return raw.map((p: any) => ({
      productName: p.title,
      productId: p.id,
      handle: p.handle,
      imageUrl: p.image?.src ?? p.images?.[0]?.src ?? null,
      price: p.variants?.[0]?.price,
      vendor: p.vendor,
      description: p.body_html || p.body || p.description || '',
    }));
  }

  async processMessage(
    from: string,
    userMessage: string,
  ): Promise<{ body: string; mediaUrl?: string; actionUrl?: string }> {
    const raw = await this.shopifyService.getProducts();
    const catalog = this.buildCatalog(raw.products ?? []);

    const intent = await this.openaiService.analyzeIntent(userMessage);

    const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    const nameRegex = /(my name is|i am) ([^.!]+)/i;
    const emailMatch = userMessage.match(emailRegex);
    const nameMatch = userMessage.match(nameRegex);

    let user = await this.memoryService.getUser(from);
    if (!user && emailMatch) {
      user = await this.memoryService.findByEmail(emailMatch[0]);
      if (user) {
        user.id = from;
        await this.memoryService.saveUser(user);
      }
    }
    if (emailMatch) {
      if (!user) user = { id: from, productInterests: [] } as UserData;
      user.email = emailMatch[0];
      await this.memoryService.saveUser(user);
    }
    if (nameMatch) {
      if (!user) user = { id: from, productInterests: [] } as UserData;
      user.name = nameMatch[2].trim();
      await this.memoryService.saveUser(user);
    }

    let body = '';
    let mediaUrl: string | undefined;
    let actionUrl: string | undefined;

    switch (intent) {
      case 'hello': {
        if (!user) {
          body =
            'Hello! Welcome to our store. You can share your name and email if you like.';
          if (emailMatch) {
            await this.memoryService.saveUser({
              id: from,
              email: emailMatch[0],
              productInterests: [],
            });
          }
        } else {
          const name = user.name || 'friend';
          let interestText = '';
          const lastId = user.productInterests?.[user.productInterests.length - 1];
          const product = lastId
            ? catalog.find((p) => String(p.productId) === lastId)
            : undefined;
          if (product) {
            interestText = ` Are you still interested in ${product.productName}?`;
          }
          body = `Welcome back, ${name}!${interestText}`;
        }
        break;
      }
      case 'store-information':
        body = await this.openaiService.generateStoreInformationResponse(
          userMessage,
        );
        break;
      case 'list-products':
        body = await this.openaiService.generateListProductsResponse(
          userMessage,
          catalog,
        );
        break;
      case 'view-product-detail': {
        const matchedId = await this.openaiService.matchProduct(
          userMessage,
          catalog,
        );
        const product = matchedId
          ? catalog.find((p) => String(p.productId) === matchedId)
          : undefined;
        if (product) {
          body = await this.openaiService.generateProductDetailResponse(
            userMessage,
            product,
          );
          if (product.imageUrl) {
            mediaUrl = product.imageUrl;
          }
          await this.memoryService.addProductInterest(from, String(product.productId));
          const domain = process.env.SHOPIFY_SHOP_DOMAIN;
          if (domain && product.handle) {
            actionUrl = `https://${domain}/products/${product.handle}`;
          }
        } else {
          body = await this.openaiService.chat([
            {
              role: 'system',
              content:
                'You are a helpful e-commerce assistant. The requested product was not found.',
            },
            { role: 'user', content: userMessage },
          ]);
        }
        break;
      }
      case 'buy-product': {
        const matchedId = await this.openaiService.matchProduct(
          userMessage,
          catalog,
        );
        const product = matchedId
          ? catalog.find((p) => String(p.productId) === matchedId)
          : undefined;
        body = await this.openaiService.generateBuyProductResponse(
          userMessage,
          product,
        );
        if (product?.imageUrl) {
          mediaUrl = product.imageUrl;
        }
        if (product) {
          await this.memoryService.addProductInterest(from, String(product.productId));
        }
        break;
      }
      default:
        body = await this.openaiService.chat([
          {
            role: 'system',
            content: 'You are a helpful e-commerce assistant.',
          },
          { role: 'user', content: userMessage },
        ]);
    }

    return { body, mediaUrl, actionUrl };
  }
}

