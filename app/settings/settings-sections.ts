// Shared by the server route (static params, validation) and the client screens.
export const SETTINGS_SECTIONS = ["account", "language", "appearance", "notifications", "data"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
