import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountExperience, type AccountMode } from "../account-experience";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false }, referrer: "no-referrer" };
const modes = ["login", "register", "forgot-password", "verify-email", "reset-password"] as const;
export default async function AccountPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!modes.includes(mode as AccountMode)) notFound();
  return <AccountExperience key={mode} mode={mode as AccountMode} mailReady={process.env.SAVORA_ACCOUNT_MAIL_DELIVERY_READY === "true"} />;
}
