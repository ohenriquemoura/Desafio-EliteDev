import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TmdbService } from './tmdb.service';

@Controller('tmdb')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class TmdbController {
  constructor(private readonly tmdbService: TmdbService) {}

  @Get('now-playing')
  nowPlaying(@Query('page') page?: string) {
    return this.tmdbService.getNowPlaying(page ? Number(page) : 1);
  }

  @Get('search')
  search(@Query('q') q = '', @Query('page') page?: string) {
    return this.tmdbService.search(q, page ? Number(page) : 1);
  }

  @Get('movies/:id')
  movie(@Param('id', ParseIntPipe) id: number) {
    return this.tmdbService.getMovie(id);
  }
}
