import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface CatalogItem {
  productName: string;
  productId: string | number;
  handle?: string;
  imageUrl?: string | null;
  price?: string | number;
  vendor?: string;
  description?: string;
}

@Injectable()
export class OpenaiService {
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly baseTemplate: string = readFileSync(
    join(process.cwd(), 'src/prompt/base_prompt.txt'),
    'utf8',
  );

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    const response = await axios.post(
      this.apiUrl,
      {
        model: 'gpt-4',
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data?.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async matchProduct(
    userMessage: string,
    catalog: CatalogItem[],
  ): Promise<string | null> {
    const catalogList = catalog
      .map((p) => `${p.productName} (id: ${p.productId})`)
      .join('; ');
    const messages = [
      {
        role: 'system',
        content:
          'Identify if the user is referring to a product from the catalog. ' +
          'Reply ONLY with the id of the product if there is a clear match. ' +
          'Reply with "none" if no product matches. ' +
          `Catalog: ${catalogList}.`,
      },
      { role: 'user', content: userMessage },
    ];

    const reply = await this.chat(messages);
    const id = reply.trim().toLowerCase();
    if (id === 'none') {
      return null;
    }
    return id;
  }

  async analyzeIntent(userMessage: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content:
          'Identify the user intent. Possible intents: hello, store-information, list-products, view-product-detail, buy-product. ' +
          'Reply ONLY with one of the intent labels.',
      },
      { role: 'user', content: userMessage },
    ];
    const reply = await this.chat(messages);
    return reply.trim().toLowerCase();
  }

  async generateStoreInformationResponse(userMessage: string): Promise<string> {
    const domain = process.env.SHOPIFY_SHOP_DOMAIN || 'our online store';
    const messages = [
      {
        role: 'system',
        content:
          `You are a helpful e-commerce assistant for the store at ${domain}. Provide store information and policies without mentioning internal APIs.`,
      },
      { role: 'user', content: userMessage },
    ];
    return this.chat(messages);
  }

  async generateListProductsResponse(
    userMessage: string,
    catalog: CatalogItem[],
  ): Promise<string> {
    const catalogInfo = catalog
      .map(
        (p) => `${p.productName} (price: ${p.price}, vendor: ${p.vendor})`,
      )
      .join('; ');
    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful e-commerce assistant. Provide a concise list of products based on the catalog. ' +
          `Catalog: ${catalogInfo}.`,
      },
      { role: 'user', content: userMessage },
    ];
    return this.chat(messages);
  }

  async generateProductDetailResponse(
    userMessage: string,
    product: CatalogItem,
  ): Promise<string> {
    const domain = process.env.SHOPIFY_SHOP_DOMAIN;
    const link = domain && product.handle ? `https://${domain}/products/${product.handle}` : '';
    const description = product.description
      ? product.description.replace(/<[^>]+>/g, '')
      : '';
    const messages = [
      {
        role: 'system',
        content:
          `You are a helpful e-commerce assistant. Provide concise details about the product including the name, price, vendor and brief description. Mention that the product image is attached and do not disclose its URL. ${link ? 'Link: ' + link + '.' : ''} ` +
          `Product: ${product.productName} (price: ${product.price}, vendor: ${product.vendor}). ${description ? 'Description: ' + description : ''}`,
      },
      { role: 'user', content: userMessage },
    ];
    return this.chat(messages);
  }

  async generateBuyProductResponse(
    userMessage: string,
    product?: CatalogItem,
  ): Promise<string> {
    if (product) {
      const domain = process.env.SHOPIFY_SHOP_DOMAIN;
      const link = domain && product.handle ? `https://${domain}/products/${product.handle}` : '';
      const messages = [
        {
          role: 'system',
          content:
            `You are a helpful e-commerce assistant. Help the user purchase the product ${product.productName} (price: ${product.price}, vendor: ${product.vendor}). ${link ? 'Link: ' + link + '.' : ''}`,
        },
        { role: 'user', content: userMessage },
      ];
      return this.chat(messages);
    }
    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful e-commerce assistant. The requested product was not found.',
      },
      { role: 'user', content: userMessage },
    ];
    return this.chat(messages);
  }

  buildBasePrompt(options: {
    storeName: string;
    userName?: string;
    intent: string;
    userInput: string;
  }): string {
    return this.baseTemplate
      .replace('{{store_name}}', options.storeName)
      .replace('{{user_name}}', options.userName ?? 'customer')
      .replace('{{intent}}', options.intent)
      .replace('{{user_input}}', options.userInput);
  }

  async chatWithBasePrompt(options: {
    storeName: string;
    userName?: string;
    intent: string;
    userInput: string;
  }): Promise<string> {
    const prompt = this.buildBasePrompt(options);
    return this.chat([{ role: 'system', content: prompt }]);
  }
}
