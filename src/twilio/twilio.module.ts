import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { WhatsappController } from './whatsapp.controller';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule],
  providers: [TwilioService],
  controllers: [WhatsappController],
})
export class TwilioModule {}
