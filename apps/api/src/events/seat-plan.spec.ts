import { buildSeatPlan, SEATS_PER_ROW } from './seat-plan';

describe('buildSeatPlan', () => {
  it('gera exatamente a capacidade pedida', () => {
    const seats = buildSeatPlan(25);
    expect(seats).toHaveLength(25);
  });

  it('usa 10 cadeiras por fileira e labels A1…', () => {
    const seats = buildSeatPlan(12);
    expect(seats[0]).toEqual({ rowLabel: 'A', number: 1, label: 'A1' });
    expect(seats[9]).toEqual({ rowLabel: 'A', number: 10, label: 'A10' });
    expect(seats[10]).toEqual({ rowLabel: 'B', number: 1, label: 'B1' });
    expect(seats[11]).toEqual({ rowLabel: 'B', number: 2, label: 'B2' });
    expect(SEATS_PER_ROW).toBe(10);
  });

  it('rejeita capacidade inválida', () => {
    expect(() => buildSeatPlan(0)).toThrow(/inválida/i);
    expect(() => buildSeatPlan(261)).toThrow(/máxima/i);
  });
});
