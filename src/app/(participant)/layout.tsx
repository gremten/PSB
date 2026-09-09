import { ParticipantShell } from "@/features/usability/participant-shell";

export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  return <ParticipantShell>{children}</ParticipantShell>;
}
