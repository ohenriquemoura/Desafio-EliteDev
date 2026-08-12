import { AuthArea } from "@/components/AuthArea";

export default function EventsPage() {
  return (
    <AuthArea
      expectedRole="CLIENT"
      title="Eventos"
      description="Em breve: listagem, reserva e pagamento de ingressos."
    />
  );
}
