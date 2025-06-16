import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { WhatsappController } from './whatsapp.controller';
import { ShopifyModule } from '../shopify/shopify.module';
import { OpenaiModule } from '../openai/openai.module';

@Module({
  imports: [ShopifyModule, OpenaiModule],
  providers: [TwilioService],
  controllers: [WhatsappController],
})
export class TwilioModule {}
