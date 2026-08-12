import { AuthArea } from "@/components/AuthArea";

export default function OrganizerPage() {
  return (
    <AuthArea
      expectedRole="ORGANIZER"
      title="Área do organizador"
      description="Em breve: criar e gerenciar eventos a partir do TMDb."
    />
  );
}
