import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { GateModule } from './gate/gate.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReservationsModule } from './reservations/reservations.module';
import { TicketsModule } from './tickets/tickets.module';
import { TmdbModule } from './tmdb/tmdb.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TmdbModule,
    EventsModule,
    ReservationsModule,
    TicketsModule,
    GateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
