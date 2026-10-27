import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sjekker om siste kamp i gjeldende runde er ferdig og synker i så fall FPL-data.
// De fleste tickene avsluttes umiddelbart (se autoSyncWakeAt i autoSync.ts).
crons.interval("auto-synk etter siste kamp i runden", { minutes: 15 }, internal.autoSync.tick, {});

// Holder spillerkatalogen (xG, priser, eierandeler) til Analyse-fanene oppdatert.
// Hver synk leser og skriver nesten hele tabellen (overføringstellerne endrer seg hele tiden),
// så intervallet er det som styrer databasebruken. Hver 3. time er nok for prisendringer og xG.
crons.interval("synk FPL-spillerdata", { hours: 3 }, internal.players.sync, {});

export default crons;
