const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const SEATS_PER_ROW = 10;
export const MAX_SEATS_PER_RESERVATION = 8;

export type SeatPlanItem = {
  rowLabel: string;
  number: number;
  label: string;
};

export function buildSeatPlan(
  capacity: number,
  cols = SEATS_PER_ROW,
): SeatPlanItem[] {
  if (capacity < 1) {
    throw new Error('Capacidade inválida para gerar assentos');
  }

  const maxCapacity = ROW_LABELS.length * cols;
  if (capacity > maxCapacity) {
    throw new Error(`Capacidade máxima para mapa de assentos é ${maxCapacity}`);
  }

  const seats: SeatPlanItem[] = [];
  for (let index = 0; index < capacity; index += 1) {
    const rowLabel = ROW_LABELS[Math.floor(index / cols)];
    const number = (index % cols) + 1;
    seats.push({
      rowLabel,
      number,
      label: `${rowLabel}${number}`,
    });
  }
  return seats;
}
