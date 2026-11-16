import { notFound } from "next/navigation";
import { Footer, Header } from "../../ui";
import { SettingsSectionScreen } from "../settings-screens";
import { SETTINGS_SECTIONS, type SettingsSection } from "../settings-sections";

const titles: Record<SettingsSection, string> = { account: "Account", language: "Language", appearance: "Appearance", notifications: "Notifications", data: "Data on this device" };

export function generateStaticParams() {
  return SETTINGS_SECTIONS.map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: (SETTINGS_SECTIONS as readonly string[]).includes(section) ? titles[section as SettingsSection] : "Settings" };
}

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SETTINGS_SECTIONS as readonly string[]).includes(section)) notFound();
  return <main><Header /><SettingsSectionScreen section={section as SettingsSection} /><Footer /></main>;
}
