import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateReservationDto } from './reservation.dto';

describe('CreateReservationDto', () => {
  it('aceita lista válida de cadeiras', async () => {
    const dto = plainToInstance(CreateReservationDto, {
      eventId: '11111111-1111-4111-8111-111111111111',
      seatIds: [
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejeita lista vazia', async () => {
    const dto = plainToInstance(CreateReservationDto, {
      eventId: '11111111-1111-4111-8111-111111111111',
      seatIds: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejeita mais de 8 cadeiras', async () => {
    const seatIds = Array.from({ length: 9 }, (_, i) => {
      const n = String(i + 1).padStart(12, '0');
      return `44444444-4444-4444-8444-${n}`;
    });

    const dto = plainToInstance(CreateReservationDto, {
      eventId: '11111111-1111-4111-8111-111111111111',
      seatIds,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
