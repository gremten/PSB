export type CashbackVariant = "connected" | "disconnected";
export type TaskResult = "unaided" | "aided" | "failed" | "corrupted";
export type NextMonthCashbackSelectionStatus = "locked" | "available" | "draft" | "confirmed";

// Product state intentionally has no moderator or session fields.
export interface ParticipantProductState {
  cashbackConnected: boolean;
  selectedCashbackCategories: string[];
  nextMonthCashbackCategories: string[];
  nextMonthCashbackSelectionStatus: NextMonthCashbackSelectionStatus;
  cardDetailsRevealed: boolean;
  cashbackSuccessVisible: boolean;
  accountsHidden: boolean;
  dismissedHomePromos: string[];
  homeHistoryCollapsed: boolean;
  homeCurrencyCollapsed: boolean;
}

// Research context intentionally has no banking/product fields.
export interface ResearchSessionState {
  cashbackVariant: CashbackVariant;
  sessionId: string | null;
  participantCode: string | null;
  currentTask: string | null;
  currentTaskRunId: string | null;
  currentScreen: string;
  resetVersion: number;
  sessionStatus: "idle" | "draft" | "running" | "ended";
}

export interface ResearchSession {
  id: string;
  participantCode: string;
  variant: CashbackVariant;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  lastSeenAt?: string | null;
  endReason?: "moderator" | "client_timeout" | null;
  buildId: string;
}

export interface TaskRun {
  id: string;
  sessionId: string;
  taskCode: string;
  startedAt: string;
  endedAt: string | null;
  result: TaskResult | null;
  wasAided: boolean;
  easeScore: number | null;
  easeReason: string | null;
  moderatorNote: string | null;
  corruptedReason: string | null;
}

export interface TrackedEvent {
  id: number;
  sessionId: string;
  taskRunId: string | null;
  timestamp: string;
  type: string;
  screen: string | null;
  action: string | null;
  target: string | null;
  metadata: Record<string, unknown>;
}

export interface SessionSnapshot {
  session: ResearchSession;
  taskRuns: TaskRun[];
  events: TrackedEvent[];
}
