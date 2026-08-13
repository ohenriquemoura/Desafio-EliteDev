export type GateResult =
  | "VALID"
  | "ALREADY_USED"
  | "INVALID"
  | "WRONG_EVENT";

export type GateValidation = {
  result: GateResult;
  message: string;
  usedAt?: string | null;
  eventTitle?: string;
  venue?: string;
  seatLabel?: string | null;
};

export function gateResultLabel(result: GateResult) {
  switch (result) {
    case "VALID":
      return "Válido";
    case "ALREADY_USED":
      return "Já utilizado";
    case "INVALID":
      return "Inválido";
    case "WRONG_EVENT":
      return "Evento errado";
    default:
      return result;
  }
}
