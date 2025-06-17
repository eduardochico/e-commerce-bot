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

  private readonly templates = {
    base: readFileSync(
      join(process.cwd(), 'src/prompt/base_prompt.txt'),
      'utf8',
    ),
    storeInfo: readFileSync(
      join(process.cwd(), 'src/prompt/store_information_prompt.txt'),
      'utf8',
    ),
    listProducts: readFileSync(
      join(process.cwd(), 'src/prompt/list_products_prompt.txt'),
      'utf8',
    ),
    productDetail: readFileSync(
      join(process.cwd(), 'src/prompt/product_detail_prompt.txt'),
      'utf8',
    ),
    buyProduct: readFileSync(
      join(process.cwd(), 'src/prompt/buy_product_prompt.txt'),
      'utf8',
    ),
    productNotFound: readFileSync(
      join(process.cwd(), 'src/prompt/product_not_found_prompt.txt'),
      'utf8',
    ),
    checkout: readFileSync(
      join(process.cwd(), 'src/prompt/checkout_prompt.txt'),
      'utf8',
    ),
  } as const;

  private fillTemplate(
    template: string,
    variables: Record<string, string | undefined>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
    }
    return result;
  }


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
          'Identify the user intent. Possible intents: hello, store-information, list-products, view-product-detail, buy-product, checkout. ' +
          'Reply ONLY with one of the intent labels.',
      },
      { role: 'user', content: userMessage },
    ];
    const reply = await this.chat(messages);
    return reply.trim().toLowerCase();
  }

  async generateStoreInformationResponse(
    userMessage: string,
    storeName: string,
    userName?: string,
  ): Promise<string> {
    const domain = process.env.SHOPIFY_SHOP_DOMAIN || 'our online store';
    const prompt = this.fillTemplate(this.templates.storeInfo, {
      store_domain: domain,
      store_name: storeName,
      user_name: userName ?? 'customer',
      intent: 'store-information',
      user_input: userMessage,
    });
    return this.chat([{ role: 'system', content: prompt }]);
  }

  async generateListProductsResponse(
    userMessage: string,
    catalog: CatalogItem[],
    storeName: string,
    userName?: string,
  ): Promise<string> {
    const catalogInfo = catalog
      .map(
        (p) => `${p.productName} (price: ${p.price}, vendor: ${p.vendor})`,
      )
      .join('; ');
    const prompt = this.fillTemplate(this.templates.listProducts, {
      catalog_info: catalogInfo,
      store_name: storeName,
      user_name: userName ?? 'customer',
      intent: 'list-products',
      user_input: userMessage,
    });
    return this.chat([{ role: 'system', content: prompt }]);
  }

  async generateProductDetailResponse(
    userMessage: string,
    product: CatalogItem,
    storeName: string,
    userName?: string,
    lastProduct?: string,
  ): Promise<string> {
    const domain = process.env.SHOPIFY_SHOP_DOMAIN;
    const link = domain && product.handle ? `https://${domain}/products/${product.handle}` : '';
    const description = product.description
      ? product.description.replace(/<[^>]+>/g, '')
      : '';
    const prompt = this.fillTemplate(this.templates.productDetail, {
      link: link ? `Link: ${link}.` : '',
      product_name: product.productName,
      price: String(product.price),
      vendor: product.vendor ?? '',
      description: description ? `Description: ${description}` : '',
      store_name: storeName,
      user_name: userName ?? 'customer',
      last_product: lastProduct ?? '',
      intent: 'view-product-detail',
      user_input: userMessage,
    });
    return this.chat([{ role: 'system', content: prompt }]);
  }

  async generateBuyProductResponse(
    userMessage: string,
    product: CatalogItem | undefined,
    storeName: string,
    userName?: string,
    lastProduct?: string,
  ): Promise<string> {
    if (product) {
      const domain = process.env.SHOPIFY_SHOP_DOMAIN;
      const link = domain && product.handle ? `https://${domain}/products/${product.handle}` : '';
      const prompt = this.fillTemplate(this.templates.buyProduct, {
        product_name: product.productName,
        price: String(product.price),
        vendor: product.vendor ?? '',
        link: link ? `Link: ${link}.` : '',
        store_name: storeName,
        user_name: userName ?? 'customer',
        last_product: lastProduct ?? '',
        intent: 'buy-product',
        user_input: userMessage,
      });
      return this.chat([{ role: 'system', content: prompt }]);
    }
    return this.generateProductNotFoundResponse(
      userMessage,
      'buy-product',
      storeName,
      userName,
    );
  }

  async generateCheckoutResponse(
    userMessage: string,
    cartSummary: string,
    checkoutLink: string,
    storeName: string,
    userName?: string,
  ): Promise<string> {
    const prompt = this.fillTemplate(this.templates.checkout, {
      cart_items: cartSummary,
      checkout_link: checkoutLink ? `Checkout link: ${checkoutLink}.` : '',
      store_name: storeName,
      user_name: userName ?? 'customer',
      intent: 'checkout',
      user_input: userMessage,
    });
    return this.chat([{ role: 'system', content: prompt }]);
  }

  async generateProductNotFoundResponse(
    userMessage: string,
    intent: string,
    storeName: string,
    userName?: string,
  ): Promise<string> {
    const prompt = this.fillTemplate(this.templates.productNotFound, {
      store_name: storeName,
      user_name: userName ?? 'customer',
      intent,
      user_input: userMessage,
    });
    return this.chat([{ role: 'system', content: prompt }]);
  }

  buildBasePrompt(options: {
    storeName: string;
    userName?: string;
    intent: string;
    userInput: string;
  }): string {
    return this.fillTemplate(this.templates.base, {
      store_name: options.storeName,
      user_name: options.userName ?? 'customer',
      intent: options.intent,
      user_input: options.userInput,
    });
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
