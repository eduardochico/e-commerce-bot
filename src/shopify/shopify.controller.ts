import { Controller, Get } from '@nestjs/common';
import { ShopifyService } from './shopify.service';

@Controller('products')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  @Get()
  async findAll() {
    return this.shopifyService.getProducts();
  }
}
