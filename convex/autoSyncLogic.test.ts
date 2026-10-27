import { describe, expect, it } from "vitest";
import {
  decideAutoSync,
  isRoundFinal,
  morningSyncMs,
  type FixtureLite,
} from "./autoSyncLogic";

const LAST_KICKOFF = "2026-10-25T16:30:00Z";
const fixture = (over: Partial<FixtureLite> = {}): FixtureLite => ({
  kickoff_time: LAST_KICKOFF,
  finished: true,
  finished_provisional: true,
  ...over,
});

// Siste kamp spilt søndag kveld; sommertiden sluttet natt til 25. okt, så 08:00 = 07:00Z.
const MORNING_0800 = Date.parse("2026-10-26T07:00:00Z");
const base = {
  fixtures: [fixture()],
  gw: 8,
  roundFinal: false,
  doneGw: null as number | null,
  doneStage: null as "provisional" | "final" | "morning" | null,
};

describe("isRoundFinal", () => {
  it("krever både finished og data_checked", () => {
    expect(isRoundFinal({ finished: true, data_checked: true })).toBe(true);
    expect(isRoundFinal({ finished: true, data_checked: false })).toBe(false);
    expect(isRoundFinal({ finished: false, data_checked: true })).toBe(false);
  });
});

describe("morningSyncMs", () => {
  it("er første 08:00 norsk tid etter tidspunktet", () => {
    expect(morningSyncMs(Date.parse("2026-10-25T18:15:00Z"))).toBe(MORNING_0800);
  });
});

describe("decideAutoSync – morgensteg", () => {
  it("synker så snart FPL har flagget runden som ferdig, også før 08:00", () => {
    const now = Date.parse("2026-10-26T04:00:00Z");
    expect(
      decideAutoSync({ ...base, now, roundFinal: true, doneGw: 8, doneStage: "final" })
    ).toEqual({ kind: "sync", stage: "morning" });
  });

  it("venter forbi 08:00 hvis FPL ikke har flagget runden ennå", () => {
    const now = MORNING_0800 + 3 * 60 * 60 * 1000;
    expect(decideAutoSync({ ...base, now, doneGw: 8, doneStage: "final" })).toEqual({
      kind: "wait",
    });
  });

  it("synker likevel et døgn etter 08:00 hvis flaggene aldri kommer", () => {
    const now = MORNING_0800 + 24 * 60 * 60 * 1000;
    expect(decideAutoSync({ ...base, now, doneGw: 8, doneStage: "final" })).toEqual({
      kind: "sync",
      stage: "morning",
    });
  });

  it("morgensynker ikke mens kampene ikke er ferdige", () => {
    const now = Date.parse("2026-10-26T04:00:00Z");
    const fixtures = [fixture({ finished: false, finished_provisional: false })];
    expect(decideAutoSync({ ...base, fixtures, now, roundFinal: true })).toEqual({
      kind: "wait",
    });
  });

  it("er ferdig etter morgensynken", () => {
    const now = MORNING_0800 + 60 * 60 * 1000;
    expect(
      decideAutoSync({ ...base, now, roundFinal: true, doneGw: 8, doneStage: "morning" })
    ).toEqual({ kind: "done" });
  });
});

describe("decideAutoSync – tidligere steg", () => {
  it("synker foreløpig når alle kamper er ferdig, men ikke bekreftet", () => {
    const now = Date.parse("2026-10-25T19:00:00Z");
    const fixtures = [fixture({ finished: false })];
    expect(decideAutoSync({ ...base, fixtures, now })).toEqual({
      kind: "sync",
      stage: "provisional",
    });
  });

  it("synker final når FPL har bekreftet poengene", () => {
    const now = Date.parse("2026-10-25T19:30:00Z");
    expect(decideAutoSync({ ...base, now, doneGw: 8, doneStage: "provisional" })).toEqual({
      kind: "sync",
      stage: "final",
    });
  });

  it("venter før buffertiden etter siste avspark er over", () => {
    const now = Date.parse("2026-10-25T17:00:00Z");
    expect(decideAutoSync({ ...base, now })).toEqual({
      kind: "wait",
      wakeAt: Date.parse(LAST_KICKOFF) + 105 * 60 * 1000,
    });
  });
});
