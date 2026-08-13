import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsUUID,
} from 'class-validator';
import { MAX_SEATS_PER_RESERVATION } from '../../events/seat-plan';

export class CreateReservationDto {
  @IsUUID()
  eventId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SEATS_PER_RESERVATION)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  seatIds!: string[];
}

export class PayReservationDto {
  /** Cenário de pagamento simulado */
  @IsIn(['approve', 'decline'])
  outcome!: 'approve' | 'decline';
}
