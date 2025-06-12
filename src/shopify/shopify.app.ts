import { shopifyApp, LATEST_API_VERSION, type ShopifyApp } from 'shopify-app-remix/server';
import { MemorySessionStorage } from '@shopify/shopify-app-session-storage-memory';
import { restResources } from '@shopify/shopify-api/rest/admin/2023-10';

export const shopify: ShopifyApp<any> = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  appUrl: process.env.SHOPIFY_APP_URL!,
  adminApiAccessToken: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN!,
  scopes: ['read_products'],
  apiVersion: LATEST_API_VERSION,
  sessionStorage: new MemorySessionStorage() as any,
  restResources,
});
