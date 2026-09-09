"use client";

import { type FormEvent, useState } from "react";
import { DetailHeader, styles } from "@/features/bank/bank-ui";
import { track } from "@/lib/testing/tracking";

const expected = { number: "4588234445633124", expiry: "07/28", cvv: "456" };

export default function PaymentPage() {
  const [fields, setFields] = useState({ number: "", expiry: "", cvv: "" });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const success = fields.number.replace(/\s/g, "") === expected.number && fields.expiry === expected.expiry && fields.cvv === expected.cvv;
    setStatus(success ? "success" : "error");
    track("action", { screen: "/payment", action: "payment.fake.validation", metadata: { success, completedFields: Object.values(fields).filter(Boolean).length } });
  };
  const update = (field: keyof typeof fields, value: string) => setFields((current) => ({ ...current, [field]: value }));
  const blur = (field: keyof typeof fields) => track("action", { screen: "/payment", action: "payment.field.completed", target: field, metadata: { complete: Boolean(fields[field]) } });

  return (
    <main className={styles.screen}>
      <DetailHeader title="Тестовая оплата" backHref="/card" trailing={<span className={styles.accountBadge}>Демо</span>} />
      <section className={`${styles.surface} ${styles.formSurface}`}>
        <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: 13, lineHeight: "18px" }}>Введите вымышленные реквизиты демонстрационной карты. Форма ничего не оплачивает и не сохраняет значения.</p>
        <form className={styles.form} autoComplete="off" onSubmit={submit}>
          <label className={styles.fieldLabel}>Номер карты<input className={styles.field} inputMode="numeric" value={fields.number} onChange={(event) => update("number", event.target.value)} onBlur={() => blur("number")} /></label>
          <div className={styles.fieldGrid}>
            <label className={styles.fieldLabel}>Срок<input className={styles.field} placeholder="ММ/ГГ" value={fields.expiry} onChange={(event) => update("expiry", event.target.value)} onBlur={() => blur("expiry")} /></label>
            <label className={styles.fieldLabel}>CVV<input className={styles.field} inputMode="numeric" value={fields.cvv} onChange={(event) => update("cvv", event.target.value)} onBlur={() => blur("cvv")} /></label>
          </div>
          <button className={`${styles.primaryButton} ${styles.fullButton}`} type="submit" data-track="payment.fake.submit">Проверить данные</button>
          {status === "success" && <p className={`${styles.formMessage} ${styles.successMessage}`}>Данные заполнены верно. Тестовая задача выполнена.</p>}
          {status === "error" && <p className={`${styles.formMessage} ${styles.errorMessage}`}>Проверьте реквизиты демонстрационной карты.</p>}
        </form>
      </section>
    </main>
  );
}
