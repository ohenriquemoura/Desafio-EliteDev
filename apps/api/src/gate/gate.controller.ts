import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { GateService } from './gate.service';

@Controller('gate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.GATE)
export class GateController {
  constructor(private readonly gateService: GateService) {}

  @Post('validate')
  validate(@Body() dto: ValidateTicketDto) {
    return this.gateService.validate(dto);
  }
}
