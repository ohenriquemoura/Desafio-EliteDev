import { Module } from '@nestjs/common';
import { TmdbModule } from '../tmdb/tmdb.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TmdbModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
