import { Controller, Get, Param } from '@nestjs/common';
import { ShopifyService } from './shopify.service';

@Controller('products')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  @Get()
  async findAll() {
    return this.shopifyService.getProducts();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shopifyService.getProduct(id);
  }

  @Get(':id/image')
  async findImage(@Param('id') id: string) {
    const imageUrl = await this.shopifyService.getProductImage(id);
    return { imageUrl };
  }
}
