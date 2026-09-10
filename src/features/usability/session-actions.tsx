"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/moderator/moderator.module.css";
import type { ResearchSession } from "@/lib/testing/types";

export function SessionActions({ session, onChanged }: { session: ResearchSession; onChanged?: (deleted: boolean) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mutate = async (action: "end" | "delete") => {
    if (action === "delete" && !window.confirm(`Удалить запись «${session.participantCode}» и все её события и метрики? Это действие нельзя отменить.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/moderator/sessions/${encodeURIComponent(session.id)}`, {
        method: action === "end" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        ...(action === "end" ? { body: JSON.stringify({ action: "end" }) } : {}),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Не удалось изменить запись");
      if (onChanged) onChanged(action === "delete");
      else if (action === "delete") router.replace("/moderator");
      else router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка запроса"); }
    finally { setBusy(false); }
  };
  return <div className={styles.sessionActions}>
    <p className={styles.build}>{session.endedAt
      ? `Завершена: ${session.endReason === "client_timeout" ? "клиент отключился" : "модератором"}`
      : "Запись идёт · автозавершение через 90 секунд без связи с клиентом"}</p>
    <div className={styles.buttonRow}>
      {!session.endedAt && <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => void mutate("end")}>Завершить сессию</button>}
      <button type="button" className={`${styles.button} ${styles.danger}`} disabled={busy} onClick={() => void mutate("delete")}>Удалить запись</button>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
