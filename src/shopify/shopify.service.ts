import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { shopify } from './shopify.app';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2023-10';

@Injectable()
export class ShopifyService {
  private readonly shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;

  private readonly api = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: ['read_products'],
    hostName: this.shopDomain!,
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: false,
    isCustomStoreApp: true,
    adminApiAccessToken: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN!,
    restResources,
  });

  async getProducts(): Promise<any> {
    if (!this.shopDomain) {
      throw new HttpException(
        'Shopify shop domain is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const session = this.api.session.customAppSession(this.shopDomain);
    try {
      const { Product } = this.api.rest.resources;
      const response = await Product.all({ session });
      return response.data.map((p: any) => (typeof p.toJSON === 'function' ? p.toJSON() : p));
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to fetch products',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
