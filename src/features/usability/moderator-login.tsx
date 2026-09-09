"use client";

import { FormEvent, useState } from "react";
import styles from "@/app/moderator/moderator.module.css";

export function ModeratorLogin({ configured }: { configured: boolean }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/moderator/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret }) });
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? "Не удалось войти");
    window.location.reload();
  };
  return <main className={styles.page}><section className={`${styles.card} ${styles.login}`}><p className={styles.build}>PSB usability lab</p><h1 className={styles.brand}>Вход модератора</h1>{configured ? <form className={styles.form} onSubmit={submit}><label className={styles.label}>Секрет из MODERATOR_SECRET<input autoFocus className={styles.input} type="password" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>{error && <div className={styles.error}>{error}</div>}<button className={styles.button}>Открыть dashboard</button></form> : <div className={styles.error}>MODERATOR_SECRET не задан. Скопируйте .env.example в .env.local, задайте секрет и перезапустите сервер.</div>}</section></main>;
}
