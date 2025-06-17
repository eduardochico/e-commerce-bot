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

    const storeName = process.env.SHOPIFY_SHOP_DOMAIN || 'our store';

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

    const lastId = user?.lastProductId;
    const lastProduct = lastId
      ? catalog.find((p) => String(p.productId) === lastId)
      : undefined;
    const lastProductName = lastProduct?.productName;

    let body = '';
    let mediaUrl: string | undefined;
    let actionUrl: string | undefined;

    switch (intent) {
      case 'hello': {
        if (!user) {
          body =
            'Hello! Welcome to our store. Could you tell me your name? You can also share your email if you like.';
          if (emailMatch) {
            await this.memoryService.saveUser({
              id: from,
              email: emailMatch[0],
              productInterests: [],
            });
          }
        } else if (!user.name) {
          body =
            'Hi there! I do not have your name yet. What should I call you? You can also share your email if you like.';
      } else {
        const name = user.name;
        let interestText = '';
        const lastId = user.lastProductId;
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
          storeName,
          user?.name,
        );
        break;
      case 'list-products':
        body = await this.openaiService.generateListProductsResponse(
          userMessage,
          catalog,
          storeName,
          user?.name,
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
              storeName,
              user?.name,
              lastProductName,
            );
            if (product.imageUrl) {
              mediaUrl = product.imageUrl;
            }
            await this.memoryService.addProductInterest(from, String(product.productId));
            await this.memoryService.setLastProduct(from, String(product.productId));
            const domain = process.env.SHOPIFY_SHOP_DOMAIN;
            if (domain && product.handle) {
              actionUrl = `https://${domain}/products/${product.handle}`;
            }
          } else {
            body = await this.openaiService.generateProductNotFoundResponse(
              userMessage,
              'view-product-detail',
              storeName,
              user?.name,
            );
          }
          break;
        }
      case 'buy-product': {
        const matchedId = await this.openaiService.matchProduct(
          userMessage,
          catalog,
        );
        let product = matchedId
          ? catalog.find((p) => String(p.productId) === matchedId)
          : undefined;
        if (!product && lastProduct) {
          product = lastProduct;
        }
        body = await this.openaiService.generateBuyProductResponse(
          userMessage,
          product,
          storeName,
          user?.name,
          lastProductName,
        );
        if (product?.imageUrl) {
          mediaUrl = product.imageUrl;
        }
        if (product) {
          await this.memoryService.addProductInterest(from, String(product.productId));
          await this.memoryService.setLastProduct(from, String(product.productId));
          await this.memoryService.addToCart(from, String(product.productId));
        }
        break;
      }
      case 'checkout': {
        const cartItems = await this.memoryService.getCart(from);
        if (cartItems.length === 0) {
          body = await this.openaiService.generateCheckoutResponse(
            userMessage,
            'no items',
            '',
            storeName,
            user?.name,
          );
          break;
        }
        const summary = cartItems
          .map((item) => {
            const prod = catalog.find((p) => String(p.productId) === String(item.productId));
            const name = prod ? prod.productName : item.productId;
            return `${name} x${item.quantity}`;
          })
          .join('; ');
        const domain = process.env.SHOPIFY_SHOP_DOMAIN;
        const link = domain
          ? `https://${domain}/cart/${cartItems
              .map((i) => `${i.productId}:${i.quantity}`)
              .join(',')}`
          : '';
        body = await this.openaiService.generateCheckoutResponse(
          userMessage,
          summary,
          link,
          storeName,
          user?.name,
        );
        break;
      }
      default:
        body = await this.openaiService.chatWithBasePrompt({
          storeName: process.env.SHOPIFY_SHOP_DOMAIN || 'our store',
          userName: user?.name,
          intent,
          userInput: userMessage,
        });
    }

    return { body, mediaUrl, actionUrl };
  }
}

