import { IsString, IsUUID, MinLength } from 'class-validator';

export class ValidateTicketDto {
  @IsUUID()
  eventId!: string;

  @IsString()
  @MinLength(8)
  code!: string;
}
