import { IsIn, IsInt, IsUUID, Min } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  eventId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PayReservationDto {
  /** Cenário de pagamento simulado */
  @IsIn(['approve', 'decline'])
  outcome!: 'approve' | 'decline';
}
