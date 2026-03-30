import { describe, expect, it } from "vitest";

import { createServiceRegistry } from "../packages/services/src/index";

type RawRecord = {
  id: string;
  occurredAt: string;
  appId: string;
  appName: string;
  text: string;
  candidateIndex?: number | null;
  manualIgnore?: boolean;
};

const baseSettings = {
  recordingEnabled: true,
  paused: false,
  retention: {
    mode: "store-masked",
    retentionDays: 90,
    autoArchive: true,
    exportMaskingEnabled: true
  },
  filterRules: [
    {
      id: "rule-password-manager",
      type: "app",
      pattern: "com.bitwarden.desktop",
      enabled: true,
      reason: "sensitive app"
    },
    {
      id: "rule-secrets",
      type: "regex",
      pattern: "(token|密码|secret)",
      enabled: true,
      reason: "sensitive text"
    }
  ],
  stopWords: ["的", "了", "是", "我"],
  sessionGapSeconds: 600
} as const;

describe("agent A ingestion pipeline", () => {
  it("applies recording switches and ignore rules", async () => {
    const services = createServiceRegistry() as any;

    const records: RawRecord[] = [
      {
        id: "raw-001",
        occurredAt: "2026-03-30T09:12:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "今天把输入分析骨架搭起来",
        candidateIndex: 1
      },
      {
        id: "raw-002",
        occurredAt: "2026-03-30T09:18:00+08:00",
        appId: "com.bitwarden.desktop",
        appName: "Bitwarden",
        text: "token 123"
      },
      {
        id: "raw-003",
        occurredAt: "2026-03-30T09:20:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "手动忽略这一条",
        manualIgnore: true
      }
    ];

    const output = services.ingestion.processRawRecords({
      records,
      timezone: "Asia/Shanghai",
      settings: baseSettings
    });

    expect(output.events).toHaveLength(3);

    const blocked = output.events.find((event: any) => event.id === "raw-002");
    const ignored = output.events.find((event: any) => event.id === "raw-003");

    expect(blocked.scope).toBe("blocked");
    expect(blocked.isFiltered).toBe(true);
    expect(blocked.filterReasons).toContain("sensitive app");

    expect(ignored.scope).toBe("ignored");
    expect(ignored.isFiltered).toBe(true);
    expect(ignored.filterReasons).toContain("manual-ignore");
  });

  it("filters noise and de-duplicates repeated input", async () => {
    const services = createServiceRegistry() as any;

    const records: RawRecord[] = [
      {
        id: "raw-101",
        occurredAt: "2026-03-30T10:00:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "   "
      },
      {
        id: "raw-102",
        occurredAt: "2026-03-30T10:00:01+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "!!!"
      },
      {
        id: "raw-103",
        occurredAt: "2026-03-30T10:00:02+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "输入分析"
      },
      {
        id: "raw-104",
        occurredAt: "2026-03-30T10:00:03+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "输入分析"
      },
      {
        id: "raw-105",
        occurredAt: "2026-03-30T10:00:03+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "输入分析报告"
      }
    ];

    const output = services.ingestion.processRawRecords({
      records,
      timezone: "Asia/Shanghai",
      settings: baseSettings
    });

    const activeEvents = output.events.filter((event: any) => !event.isFiltered);
    const filteredEvents = output.events.filter((event: any) => event.isFiltered);

    expect(activeEvents.map((event: any) => event.id)).toEqual(["raw-103", "raw-105"]);
    expect(filteredEvents.map((event: any) => event.id)).toContain("raw-101");
    expect(filteredEvents.map((event: any) => event.id)).toContain("raw-102");
    expect(output.dropped.map((item: any) => item.id)).toContain("raw-104");
  });

  it("splits sessions by gap and marks cross-midnight sessions", async () => {
    const services = createServiceRegistry() as any;

    const records: RawRecord[] = [
      {
        id: "raw-201",
        occurredAt: "2026-03-30T23:58:00+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "会话开始"
      },
      {
        id: "raw-202",
        occurredAt: "2026-03-30T23:59:40+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "会话继续"
      },
      {
        id: "raw-203",
        occurredAt: "2026-03-31T00:05:00+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "跨日继续"
      },
      {
        id: "raw-204",
        occurredAt: "2026-03-31T00:30:00+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "新会话"
      }
    ];

    const output = services.ingestion.processRawRecords({
      records,
      timezone: "Asia/Shanghai",
      settings: {
        ...baseSettings,
        sessionGapSeconds: 600
      }
    });

    expect(output.sessions).toHaveLength(2);
    expect(output.sessions[0].eventIds).toEqual(["raw-201", "raw-202", "raw-203"]);
    expect(output.sessions[0].crossedMidnight).toBe(true);
    expect(output.sessions[1].eventIds).toEqual(["raw-204"]);

    expect(output.dailyRecords.map((item: any) => item.dateKey)).toEqual([
      "2026-03-30",
      "2026-03-31"
    ]);
  });

  it("supports historical range queries for events and sessions", async () => {
    const services = createServiceRegistry() as any;

    const records: RawRecord[] = [
      {
        id: "raw-301",
        occurredAt: "2026-03-20T10:00:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "旧数据"
      },
      {
        id: "raw-302",
        occurredAt: "2026-03-29T10:00:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "昨日数据"
      },
      {
        id: "raw-303",
        occurredAt: "2026-03-30T10:00:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "今日数据"
      }
    ];

    const output = services.ingestion.processRawRecords({
      records,
      timezone: "Asia/Shanghai",
      settings: baseSettings
    });

    const todayEvents = services.ingestion.readEvents(output.events, {
      preset: "today",
      timezone: "Asia/Shanghai",
      nowAt: "2026-03-30T22:00:00+08:00"
    });
    const last7DaysEvents = services.ingestion.readEvents(output.events, {
      preset: "last-7-days",
      timezone: "Asia/Shanghai",
      nowAt: "2026-03-30T22:00:00+08:00"
    });
    const customSessions = services.ingestion.readSessions(output.sessions, {
      preset: "custom",
      timezone: "Asia/Shanghai",
      startAt: "2026-03-29T00:00:00+08:00",
      endAt: "2026-03-30T23:59:59+08:00",
      nowAt: "2026-03-30T22:00:00+08:00"
    });

    expect(todayEvents.map((event: any) => event.id)).toEqual(["raw-303"]);
    expect(last7DaysEvents.map((event: any) => event.id)).toEqual(["raw-302", "raw-303"]);
    expect(customSessions.length).toBe(2);
  });

  it("includes cross-midnight sessions when querying the next day", async () => {
    const services = createServiceRegistry() as any;

    const records: RawRecord[] = [
      {
        id: "raw-351",
        occurredAt: "2026-03-30T23:58:00+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "会话开始"
      },
      {
        id: "raw-352",
        occurredAt: "2026-03-31T00:03:00+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "跨日继续"
      },
      {
        id: "raw-353",
        occurredAt: "2026-03-31T00:40:00+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "新会话"
      }
    ];

    const output = services.ingestion.processRawRecords({
      records,
      timezone: "Asia/Shanghai",
      settings: baseSettings
    });

    const nextDaySessions = services.ingestion.readSessions(output.sessions, {
      preset: "today",
      timezone: "Asia/Shanghai",
      nowAt: "2026-03-31T12:00:00+08:00"
    });

    expect(nextDaySessions.some((session: any) => session.crossedMidnight)).toBe(true);
  });

  it("respects custom datetime boundaries instead of day-only boundaries", async () => {
    const services = createServiceRegistry() as any;

    const records: RawRecord[] = [
      {
        id: "raw-361",
        occurredAt: "2026-03-30T09:00:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "上午输入"
      },
      {
        id: "raw-362",
        occurredAt: "2026-03-30T21:00:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "晚间输入"
      }
    ];

    const output = services.ingestion.processRawRecords({
      records,
      timezone: "Asia/Shanghai",
      settings: baseSettings
    });

    const customEvents = services.ingestion.readEvents(output.events, {
      preset: "custom",
      timezone: "Asia/Shanghai",
      startAt: "2026-03-30T20:00:00+08:00",
      endAt: "2026-03-30T23:00:00+08:00",
      nowAt: "2026-03-30T23:30:00+08:00"
    });

    expect(customEvents.map((event: any) => event.id)).toEqual(["raw-362"]);
  });

  it("handles invalid timestamps without crashing", async () => {
    const services = createServiceRegistry() as any;

    const records: RawRecord[] = [
      {
        id: "raw-401",
        occurredAt: "invalid-time",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "异常时间"
      },
      {
        id: "raw-402",
        occurredAt: "2026-03-30T12:00:00+08:00",
        appId: "org.mozilla.firefox",
        appName: "Firefox",
        text: "有效输入"
      }
    ];

    const output = services.ingestion.processRawRecords({
      records,
      timezone: "Asia/Shanghai",
      settings: baseSettings
    });

    expect(output.events.map((event: any) => event.id)).toEqual(["raw-402"]);
    expect(output.dropped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "raw-401",
          reason: "invalid-occurredAt"
        })
      ])
    );
  });

  it("provides representative input and output fixtures", async () => {
    const services = createServiceRegistry() as any;

    const outputs = services.ingestion.getRepresentativeOutputs();

    expect(outputs.length).toBeGreaterThan(0);
    expect(outputs[0].output.events.length).toBeGreaterThan(0);
    expect(outputs[0].output.sessions.length).toBeGreaterThan(0);
    expect(outputs[0].output.events.some((event: any) => event.scope === "blocked")).toBe(true);
    expect(outputs[0].output.dropped.map((item: any) => item.id)).toContain("sample-004");
  });
});
