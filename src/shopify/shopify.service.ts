import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

import axios from 'axios';


@Injectable()
export class ShopifyService {
  private readonly shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;

  private readonly accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  async getProducts(): Promise<any> {
    if (!this.shopDomain || !this.accessToken) {
      throw new HttpException(
        'Shopify credentials are not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const url = `https://${this.shopDomain}/admin/api/2023-10/products.json`;
    try {
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error?.response?.data || 'Failed to fetch products',
        error?.response?.status || HttpStatus.BAD_GATEWAY,

      );
    }
  }
}
