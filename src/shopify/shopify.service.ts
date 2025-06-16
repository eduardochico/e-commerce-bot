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
    const url = `https://${this.shopDomain}/admin/api/2024-04/products.json`;
    try {
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      });
      const products = response.data?.products ?? [];
      return products.map((p: any) => ({
        productName: p.title,
        productId: p.id,
        imageUrl: p.image?.src ?? p.images?.[0]?.src ?? null,
        price: p.variants?.[0]?.price,
        vendor: p.vendor,
      }));
    } catch (error: any) {
      throw new HttpException(
        error?.response?.data || 'Failed to fetch products',
        error?.response?.status || HttpStatus.BAD_GATEWAY,

      );
    }
  }

  async getProduct(productId: string): Promise<any> {
    if (!this.shopDomain || !this.accessToken) {
      throw new HttpException(
        'Shopify credentials are not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const url = `https://${this.shopDomain}/admin/api/2024-04/products/${productId}.json`;
    try {
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      });
      return response.data?.product;
    } catch (error: any) {
      throw new HttpException(
        error?.response?.data || 'Failed to fetch product',
        error?.response?.status || HttpStatus.BAD_GATEWAY,

      );
    }
  }

  async getProductImage(productId: string): Promise<string | null> {
    if (!this.shopDomain || !this.accessToken) {
      throw new HttpException(
        'Shopify credentials are not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const url = `https://${this.shopDomain}/admin/api/2024-04/products/${productId}/images.json`;
    try {
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      });
      return response.data?.images?.[0]?.src ?? null;
    } catch (error: any) {
      throw new HttpException(
        error?.response?.data || 'Failed to fetch product image',
        error?.response?.status || HttpStatus.BAD_GATEWAY,

      );
    }
  }
}
