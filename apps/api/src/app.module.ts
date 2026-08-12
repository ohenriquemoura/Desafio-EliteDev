import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { TmdbModule } from './tmdb/tmdb.module';

@Module({
  imports: [PrismaModule, AuthModule, TmdbModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
