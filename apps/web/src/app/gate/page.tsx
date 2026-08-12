import { AuthArea } from "@/components/AuthArea";

export default function GatePage() {
  return (
    <AuthArea
      expectedRole="GATE"
      title="Portaria"
      description="Em breve: validação de ingresso por QR ou código."
    />
  );
}
