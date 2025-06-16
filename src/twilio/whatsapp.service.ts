import { Injectable } from '@nestjs/common';
import { ShopifyService } from '../shopify/shopify.service';
import { OpenaiService, CatalogItem } from '../openai/openai.service';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly openaiService: OpenaiService,
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
    userMessage: string,
  ): Promise<{ body: string; mediaUrl?: string }> {
    const raw = await this.shopifyService.getProducts();
    const catalog = this.buildCatalog(raw.products ?? []);

    const intent = await this.openaiService.analyzeIntent(userMessage);

    let body = '';
    let mediaUrl: string | undefined;

    switch (intent) {
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

    return { body, mediaUrl };
  }
}

