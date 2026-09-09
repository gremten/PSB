import { cookies } from "next/headers";
import { getAggregateMetrics, getSessionSnapshot, listSessions } from "@/lib/db/queries";
import { isValidModeratorToken, MODERATOR_COOKIE } from "@/lib/moderator-auth";
import { ModeratorDashboard } from "@/features/usability/moderator-dashboard";
import { ModeratorLogin } from "@/features/usability/moderator-login";

export const dynamic = "force-dynamic";

export default async function ModeratorPage() {
  const cookieStore = await cookies();
  if (!isValidModeratorToken(cookieStore.get(MODERATOR_COOKIE)?.value)) {
    return <ModeratorLogin configured={Boolean(process.env.MODERATOR_SECRET)} />;
  }
  const sessions = await listSessions();
  return <ModeratorDashboard initialSessions={sessions} initialSnapshot={sessions[0] ? await getSessionSnapshot(sessions[0].id, 2000) : null} initialMetrics={await getAggregateMetrics()} />;
}
