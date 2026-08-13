import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [TicketsModule, EventsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
