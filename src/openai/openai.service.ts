import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OpenaiService {
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

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
    catalog: { productName: string; productId: string | number }[],
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
}
