import { Module } from '@nestjs/common';
import { ShopifyModule } from './shopify/shopify.module';
import { TwilioModule } from './twilio/twilio.module';

@Module({
  imports: [ShopifyModule, TwilioModule],
})
export class AppModule {}
