export type AutomationCadence = "daily" | "weekly" | "biweekly";
export type AutomationStatus = "PAUSED" | "ACTIVE";

export type AutoPilotConfig = {
  enabled: boolean;
  niche: string;
  audience: string;
  language: string;
  cadence: AutomationCadence;
  publishHourUtc: number;
  videosPerRun: number;
  autoPublish: boolean;
  privacyStatus: "private" | "unlisted" | "public";
};

export const DEFAULT_AUTOPILOT_CONFIG: AutoPilotConfig = {
  enabled: false,
  niche: "",
  audience: "",
  language: "English",
  cadence: "weekly",
  publishHourUtc: 12,
  videosPerRun: 1,
  autoPublish: false,
  privacyStatus: "private",
};

export function nextAutomationRun(from: Date, cadence: AutomationCadence, hourUtc: number) {
  const next = new Date(from);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(Math.max(0, Math.min(23, hourUtc)));
  const days = cadence === "daily" ? 1 : cadence === "biweekly" ? 14 : 7;
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
