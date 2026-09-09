import { cookies } from "next/headers";
import { usabilityTasks } from "@/config/test-scenarios";
import { getAggregateMetrics, getResearchState, getSessionSnapshot, listSessions } from "@/lib/db/queries";
import { isValidModeratorToken, MODERATOR_COOKIE } from "@/lib/moderator-auth";
import { ModeratorDashboard } from "@/features/usability/moderator-dashboard";
import { ModeratorLogin } from "@/features/usability/moderator-login";

export const dynamic = "force-dynamic";

export default async function ModeratorPage() {
  const cookieStore = await cookies();
  if (!isValidModeratorToken(cookieStore.get(MODERATOR_COOKIE)?.value)) {
    return <ModeratorLogin configured={Boolean(process.env.MODERATOR_SECRET)} />;
  }
  const research = await getResearchState();
  return <ModeratorDashboard initialSessions={await listSessions()} initialResearch={research} initialSnapshot={research.sessionId ? await getSessionSnapshot(research.sessionId) : null} initialMetrics={await getAggregateMetrics()} tasks={usabilityTasks} />;
}
