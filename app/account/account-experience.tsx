"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { accountAction, readAccountSession } from "../../lib/auth/account-client";
import { safeAccountReturn, validNewPassword } from "../../lib/auth/account-boundary.mjs";
import { useI18n } from "../i18n";
import { Footer, Header } from "../ui";
import styles from "./account.module.css";
import { localCommonsFile } from "../../lib/media/local-media";

// CC0 photographs (no attribution line needed on a form page), served from Savora's own copies.
const panelPhotos = [
  localCommonsFile("柿饼.jpg", ""),
  localCommonsFile("Songpyeon.jpg", ""),
  localCommonsFile("Sugar-roasted chestnuts (1).jpg", ""),
].filter(Boolean);

export type AccountMode = "login" | "register" | "forgot-password" | "verify-email" | "reset-password";
type AccountAction = AccountMode | "resend-verification";
// Auth copy is local, not sent to a translation provider together with private data.
const labels = {
  en: ["Sign in", "Create an account", "Reset your password", "Verify your email", "Choose a new password", "Email", "Password", "Display name", "Continue", "Show", "Hide", "Forgot password?", "Back to sign in", "Use 15–128 characters, or at least 8 with a lowercase letter and a number.", "If eligible, your email request has been queued. Check your inbox for the link.", "Your email is verified. You can sign in now.", "Password updated. Sign in with your new password.", "Email delivery is not configured yet. Your request is saved, but no email has been sent.", "This link is missing, invalid or expired. Request a new one.", "Account service is temporarily unavailable. Try again later.", "Unable to sign in. Check your password and verify your email.", "Too many attempts. Please wait before trying again.", "Check the entered details and try again.", "Working…", "Send a verification link", "Recipes carry memory.", "Welcome back to your kitchen.", "Save recipes, plan meals and share the dishes you grew up with.", "We will email you a link to choose a new password.", "Password meets the rule"],
  zh: ["登录", "创建账号", "找回密码", "验证邮箱", "设置新密码", "邮箱", "密码", "显示名称", "继续", "显示", "隐藏", "忘记密码？", "返回登录", "密码需为 15–128 个字符；或至少 8 个字符，包含小写英文字母和数字。", "若符合条件，邮件请求已进入队列，请查看邮箱中的链接。", "邮箱验证成功，现在可以登录。", "密码已更新，请使用新密码登录。", "邮件服务尚未配置。请求已保存，但暂未发送邮件。", "链接缺失、无效或已过期，请重新申请。", "账号服务暂不可用，请稍后重试。", "无法登录，请检查密码并确认邮箱已验证。", "尝试次数过多，请稍后重试。", "请检查填写内容后重试。", "处理中…", "发送验证链接", "每道菜谱都承载着记忆。", "欢迎回到你的厨房。", "收藏菜谱、规划餐食，分享你从小吃到大的味道。", "我们会把设置新密码的链接发到你的邮箱。", "密码符合要求"],
  ja: ["ログイン", "アカウントを作成", "パスワードをリセット", "メールアドレスを確認", "新しいパスワード", "メールアドレス", "パスワード", "表示名", "続ける", "表示", "非表示", "パスワードを忘れた場合", "ログインに戻る", "15～128文字、または英小文字と数字を含む8～128文字にしてください。", "対象の場合、メール送信を受け付けました。受信箱をご確認ください。", "メール確認が完了しました。ログインできます。", "パスワードを更新しました。再度ログインしてください。", "メール送信は未設定です。リクエストは保存されましたが、メールは送信されていません。", "リンクが無効または期限切れです。再度申請してください。", "アカウントサービスを一時的に利用できません。", "ログインできません。パスワードとメール確認をご確認ください。", "試行回数が多すぎます。しばらくお待ちください。", "入力内容を確認してください。", "処理中…", "確認リンクを送信", "レシピは記憶を運ぶ。", "おかえりなさい。あなたのキッチンへ。", "レシピを保存し、献立を立て、思い出の料理を共有しましょう。", "新しいパスワードを設定するリンクをメールでお送りします。", "パスワードは条件を満たしています"],
  fr: ["Se connecter", "Créer un compte", "Réinitialiser le mot de passe", "Vérifier votre adresse e-mail", "Choisir un nouveau mot de passe", "E-mail", "Mot de passe", "Nom affiché", "Continuer", "Afficher", "Masquer", "Mot de passe oublié ?", "Retour à la connexion", "Utilisez 15 à 128 caractères, ou au moins 8 avec une lettre minuscule et un chiffre.", "Si votre compte le permet, la demande est en attente d’envoi. Consultez votre boîte mail.", "Adresse vérifiée. Vous pouvez vous connecter.", "Mot de passe modifié. Connectez-vous à nouveau.", "L’envoi d’e-mails n’est pas encore configuré. La demande est enregistrée, mais aucun e-mail n’a été envoyé.", "Lien absent, invalide ou expiré. Demandez un nouveau lien.", "Le service de compte est temporairement indisponible.", "Connexion impossible. Vérifiez votre mot de passe et votre adresse e-mail.", "Trop de tentatives. Réessayez plus tard.", "Vérifiez les informations saisies.", "En cours…", "Envoyer un lien de vérification", "Les recettes portent la mémoire.", "Bon retour dans votre cuisine.", "Enregistrez des recettes, planifiez vos repas et partagez les plats de votre enfance.", "Nous vous enverrons un lien pour choisir un nouveau mot de passe.", "Le mot de passe respecte la règle"],
  it: ["Accedi", "Crea un account", "Reimposta la password", "Verifica la tua email", "Scegli una nuova password", "Email", "Password", "Nome visualizzato", "Continua", "Mostra", "Nascondi", "Password dimenticata?", "Torna all’accesso", "Usa da 15 a 128 caratteri, oppure almeno 8 con una lettera minuscola e un numero.", "Se applicabile, la richiesta è in attesa di invio. Controlla la posta.", "Email verificata. Ora puoi accedere.", "Password aggiornata. Accedi nuovamente.", "L’invio delle email non è ancora configurato. La richiesta è salvata, ma non è stata inviata alcuna email.", "Link assente, non valido o scaduto. Richiedine uno nuovo.", "Il servizio account non è disponibile al momento.", "Accesso non riuscito. Controlla la password e verifica l’email.", "Troppi tentativi. Riprova più tardi.", "Controlla i dati inseriti.", "Attendi…", "Invia un link di verifica", "Le ricette custodiscono la memoria.", "Bentornato nella tua cucina.", "Salva ricette, pianifica i pasti e condividi i piatti con cui sei cresciuto.", "Ti invieremo un link per scegliere una nuova password.", "La password rispetta la regola"],
  es: ["Iniciar sesión", "Crear una cuenta", "Restablecer contraseña", "Verificar tu correo", "Elegir una nueva contraseña", "Correo electrónico", "Contraseña", "Nombre visible", "Continuar", "Mostrar", "Ocultar", "¿Olvidaste tu contraseña?", "Volver al inicio de sesión", "Usa entre 15 y 128 caracteres, o al menos 8 con una letra minúscula y un número.", "Si corresponde, la solicitud está en la cola de envío. Revisa tu correo.", "Correo verificado. Ya puedes iniciar sesión.", "Contraseña actualizada. Vuelve a iniciar sesión.", "El envío de correo todavía no está configurado. La solicitud se ha guardado, pero no se ha enviado ningún correo.", "El enlace falta, no es válido o ha caducado. Solicita otro.", "El servicio de cuentas no está disponible temporalmente.", "No se pudo iniciar sesión. Comprueba la contraseña y verifica el correo.", "Demasiados intentos. Inténtalo más tarde.", "Comprueba los datos introducidos.", "Procesando…", "Enviar enlace de verificación", "Las recetas guardan memoria.", "Bienvenido de nuevo a tu cocina.", "Guarda recetas, planifica comidas y comparte los platos con los que creciste.", "Te enviaremos un enlace para elegir una nueva contraseña.", "La contraseña cumple la regla"],
};
function subscribeLocation(callback: () => void) { window.addEventListener("hashchange", callback); return () => window.removeEventListener("hashchange", callback); }
function actionToken() { return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""; }

export function AccountExperience({ mode, mailReady }: { mode: AccountMode; mailReady: boolean }) {
  const { locale } = useI18n();
  const copy = labels[locale];
  const token = useSyncExternalStore(subscribeLocation, actionToken, () => "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const title = copy[["login", "register", "forgot-password", "verify-email", "reset-password"].indexOf(mode)];
  const hasPassword = ["login", "register", "reset-password"].includes(mode);
  const hasEmail = ["login", "register", "forgot-password"].includes(mode);

  async function submit(event: FormEvent, action: AccountAction = mode) {
    event.preventDefault();
    if (busy) return;
    if (["register", "reset-password"].includes(action) && !validNewPassword(password)) { setFailed(true); setMessage(13); return; }
    if (["verify-email", "reset-password"].includes(action) && !/^[A-Za-z0-9_-]{43}$/.test(token)) { setFailed(true); setMessage(18); return; }
    setBusy(true); setFailed(false); setMessage(null);
    try {
      const body: Record<string, string> = action === "register" ? { email, password, displayName: name } :
        action === "login" ? { email, password } : action === "verify-email" ? { token } :
        action === "reset-password" ? { token, password } : { email };
      const result = await accountAction(action, body);
      if (!result.response.ok) {
        setFailed(true); setMessage(result.response.status === 429 ? 21 : result.code === "InvalidPassword" && action !== "login" ? 13 : result.code === "InvalidCredentials" ? 20 : result.code === "InvalidAction" ? 18 : result.response.status >= 500 ? 19 : 22);
        return;
      }
      if (action === "login") {
        if (!readAccountSession(result.data)) { setFailed(true); setMessage(19); return; }
        // A new document discards guest/RSC state after the HttpOnly cookie is set.
        // https://developer.mozilla.org/en-US/docs/Web/API/Location/replace
        setDone(true);
        window.location.replace(safeAccountReturn(new URLSearchParams(window.location.search).get("returnTo")));
      } else {
        if (["verify-email", "reset-password"].includes(action)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setDone(action !== "resend-verification"); setMessage(action === "verify-email" ? 15 : action === "reset-password" ? 16 : mailReady ? 14 : 17);
      }
    } catch { setFailed(true); setMessage(19); }
    finally { setPassword(""); setBusy(false); }
  }

  const lead = mode === "login" ? copy[26] : mode === "register" ? copy[27] : mode === "forgot-password" ? copy[28] : null;
  const passwordOk = mode !== "login" && validNewPassword(password);

  return <><Header /><main className={styles.page} data-private translate="no">
    <div className={styles.frame}>
      <aside className={styles.panel} aria-hidden="true">
        <div className={styles.arches}>{panelPhotos.map((src, index) => <span className={styles.arch} style={{ backgroundImage: `url("${src}")` }} key={src} data-i={index} />)}</div>
        <p className={styles.tagline}><svg viewBox="0 0 80 80"><ellipse cx="22" cy="46" rx="10" ry="15" transform="rotate(-28 22 46)" fill="var(--sv-clay)" /><ellipse cx="44" cy="22" rx="10" ry="15" transform="rotate(32 44 22)" fill="var(--sv-honey)" /><ellipse cx="56" cy="56" rx="10" ry="15" transform="rotate(-62 56 56)" fill="var(--sv-leaf)" /></svg>{copy[25]}</p>
      </aside>
      <div className={styles.sheet}>
        {mode === "login" || mode === "register" ? <nav className={styles.switch} aria-label={title}>
          <Link href="/account/login" aria-current={mode === "login" ? "page" : undefined}>{copy[0]}</Link>
          <Link href="/account/register" aria-current={mode === "register" ? "page" : undefined}>{copy[1]}</Link>
        </nav> : null}
        <h1>{title}</h1>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
        <form onSubmit={submit} aria-busy={busy}>
          {mode === "register" ? <label htmlFor="account-name"><span>{copy[7]}</span><input id="account-name" name="name" autoComplete="nickname" value={name} onChange={event => setName(event.target.value)} maxLength={80} required disabled={busy || done} /></label> : null}
          {hasEmail ? <label htmlFor="account-email"><span>{copy[5]}</span><input id="account-email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required disabled={busy || done} /></label> : null}
          {hasPassword ? <label htmlFor="account-password"><span className={styles.labelRow}><span>{copy[6]}</span>{mode === "login" ? <Link className={styles.inlineLink} href="/account/forgot-password">{copy[11]}</Link> : null}</span><span className={styles.password}><input id="account-password" name="password" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={256} required disabled={busy || done} aria-describedby={mode !== "login" ? "password-guide" : undefined} /><button type="button" onClick={() => setVisible(value => !value)} aria-controls="account-password" aria-pressed={visible} aria-label={copy[visible ? 10 : 9]}><svg viewBox="0 0 24 24" aria-hidden="true">{visible ? <><path d="M3 3l18 18" /><path d="M10.6 6.2A9.6 9.6 0 0 1 12 6c5 0 8.5 4.3 9.5 6-.5.9-1.6 2.4-3.1 3.7M6.4 7.6C4.6 8.9 3.2 10.7 2.5 12c1 1.7 4.5 6 9.5 6 1.6 0 3-.4 4.3-1.1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></> : <><path d="M2.5 12c1-1.7 4.5-6 9.5-6s8.5 4.3 9.5 6c-1 1.7-4.5 6-9.5 6s-8.5-4.3-9.5-6Z" /><circle cx="12" cy="12" r="3" /></>}</svg></button></span>{mode !== "login" ? <span className={styles.hint} id="password-guide" data-ok={passwordOk ? "true" : "false"}><i aria-hidden="true">{passwordOk ? "✓" : ""}</i>{passwordOk ? copy[29] : copy[13]}</span> : null}</label> : null}
          {message !== null ? <p className={failed ? styles.error : styles.notice} role={failed ? "alert" : "status"}>{copy[message]}</p> : null}
          {!done ? <button className={styles.primary} type="submit" disabled={busy}>{busy ? <><span className={styles.spinner} aria-hidden="true" />{copy[23]}</> : mode === "verify-email" ? title : copy[8]}</button> : null}
        </form>
        <nav className={styles.links} aria-label={title}>
          {mode === "login" ? <button type="button" disabled={busy || !email} onClick={event => { void submit(event, "resend-verification"); }}>{copy[24]}</button> : mode === "register" ? null : <Link href="/account/login">{copy[12]}</Link>}
        </nav>
      </div>
    </div>
  </main><Footer /></>;
}
