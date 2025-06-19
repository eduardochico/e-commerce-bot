import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

export interface UserData {
  id: string;
  name?: string;
  email?: string;
  language?: string;
  productInterests?: string[];
  lastProductId?: string;
  cart?: Record<string, number>;
}

@Injectable()
export class MemoryService implements OnModuleDestroy {
  private client: RedisClientType;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url });
    this.client.connect().catch((err) => console.error('Redis connect error', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  private userKey(id: string) {
    return `user:${id}`;
  }

  async getUser(id: string): Promise<UserData | null> {
    const data = await this.client.get(this.userKey(id));
    return data ? (JSON.parse(data) as UserData) : null;
  }

  async saveUser(user: UserData): Promise<void> {
    await this.client.set(this.userKey(user.id), JSON.stringify(user));
    if (user.email) {
      await this.client.set(`userEmail:${user.email}`, user.id);
    }
  }

  async findByEmail(email: string): Promise<UserData | null> {
    const id = await this.client.get(`userEmail:${email}`);
    return id ? this.getUser(id) : null;
  }

  async addProductInterest(id: string, productId: string): Promise<void> {
    const user = (await this.getUser(id)) || { id, productInterests: [] };
    const set = new Set(user.productInterests ?? []);
    set.add(String(productId));
    user.productInterests = Array.from(set);
    user.lastProductId = String(productId);
    await this.saveUser(user);
  }

  async setLastProduct(id: string, productId: string): Promise<void> {
    const user = (await this.getUser(id)) || { id };
    user.lastProductId = String(productId);
    await this.saveUser(user);
  }

  async getLastProduct(id: string): Promise<string | undefined> {
    const user = await this.getUser(id);
    return user?.lastProductId;
  }

  async setLanguage(id: string, language: string): Promise<void> {
    const user = (await this.getUser(id)) || { id } as UserData;
    user.language = language;
    await this.saveUser(user);
  }

  async getLanguage(id: string): Promise<string | undefined> {
    const user = await this.getUser(id);
    return user?.language;
  }

  async addToCart(id: string, productId: string): Promise<void> {
    const user = (await this.getUser(id)) || { id, cart: {} } as UserData;
    if (!user.cart) user.cart = {};
    user.cart[productId] = (user.cart[productId] || 0) + 1;
    await this.saveUser(user);
  }

  async removeFromCart(id: string, productId: string): Promise<void> {
    const user = await this.getUser(id);
    if (user?.cart && user.cart[productId]) {
      delete user.cart[productId];
      await this.saveUser(user);
    }
  }

  async updateCartItem(id: string, productId: string, quantity: number): Promise<void> {
    const user = (await this.getUser(id)) || { id, cart: {} } as UserData;
    if (!user.cart) user.cart = {};
    if (quantity <= 0) {
      delete user.cart[productId];
    } else {
      user.cart[productId] = quantity;
    }
    await this.saveUser(user);
  }

  async getCart(id: string): Promise<{ productId: string; quantity: number }[]> {
    const user = await this.getUser(id);
    const cart = user?.cart ?? {};
    return Object.entries(cart).map(([productId, quantity]) => ({
      productId,
      quantity: Number(quantity),
    }));
  }

  async clearCart(id: string): Promise<void> {
    const user = (await this.getUser(id)) || { id } as UserData;
    user.cart = {};
    await this.saveUser(user);
  }
}
