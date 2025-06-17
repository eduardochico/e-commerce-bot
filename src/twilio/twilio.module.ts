import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { WhatsappController } from './whatsapp.controller';
import { ShopifyModule } from '../shopify/shopify.module';
import { OpenaiModule } from '../openai/openai.module';
import { MemoryModule } from '../memory/memory.module';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [ShopifyModule, OpenaiModule, MemoryModule],
  providers: [TwilioService, WhatsappService],
  controllers: [WhatsappController],
})
export class TwilioModule {}
