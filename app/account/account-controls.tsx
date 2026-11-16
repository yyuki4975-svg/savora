"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { accountAction, readAccountSession, type AccountSession } from "../../lib/auth/account-client";
import { useI18n } from "../i18n";
import styles from "./account.module.css";

export function AccountControls() {
  const { locale } = useI18n();
  const copy = {
    en: ["Sign in", "Create an account", "Sign out", "Account service is temporarily unavailable.", "Working…"],
    zh: ["登录", "创建账号", "退出登录", "账号服务暂不可用。", "处理中…"],
    ja: ["ログイン", "アカウントを作成", "ログアウト", "アカウントサービスを一時的に利用できません。", "処理中…"],
    fr: ["Se connecter", "Créer un compte", "Se déconnecter", "Le service de compte est temporairement indisponible.", "En cours…"],
    it: ["Accedi", "Crea un account", "Esci", "Il servizio account non è disponibile al momento.", "Attendi…"],
    es: ["Iniciar sesión", "Crear una cuenta", "Cerrar sesión", "El servicio de cuentas no está disponible temporalmente.", "Procesando…"],
  }[locale];
  const [session, setSession] = useState<AccountSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account/session", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async response => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Unavailable");
        const value = readAccountSession(await response.json());
        if (!value) throw new Error("InvalidResponse");
        return value;
      }).then(value => { if (!controller.signal.aborted) setSession(value); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);
  async function logout() {
    if (!session || busy) return;
    setBusy(true); setError(false);
    try {
      const result = await accountAction("logout", {}, session.csrfToken);
      if (!result.response.ok && result.response.status !== 401) throw new Error("Unavailable");
      window.location.replace("/profile");
    } catch { setError(true); setBusy(false); }
  }
  return <div className={styles.controls} data-private translate="no">
    {session ? <><span>{session.account.displayName}</span><button type="button" disabled={busy} onClick={() => { void logout(); }}>{copy[busy ? 4 : 2]}</button></> : <><Link href="/account/login?returnTo=%2Fprofile">{copy[0]}</Link><Link href="/account/register">{copy[1]}</Link></>}
    {error ? <span role="status">{copy[3]}</span> : null}
  </div>;
}
