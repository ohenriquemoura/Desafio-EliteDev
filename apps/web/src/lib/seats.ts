export type SeatStatus = "AVAILABLE" | "HELD" | "SOLD";

export type SeatMapSeat = {
  id: string;
  number: number;
  label: string;
  status: SeatStatus;
};

export type SeatMapRow = {
  rowLabel: string;
  seats: SeatMapSeat[];
};

export type SeatMap = {
  eventId: string;
  capacity: number;
  availableSeats: number;
  rows: SeatMapRow[];
};
