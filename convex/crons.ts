import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sjekker om siste kamp i gjeldende runde er ferdig og synker i så fall FPL-data.
// De fleste tickene avsluttes umiddelbart (se autoSyncWakeAt i autoSync.ts).
crons.interval("auto-synk etter siste kamp i runden", { minutes: 15 }, internal.autoSync.tick, {});

export default crons;
