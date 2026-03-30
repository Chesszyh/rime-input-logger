import type { TimeRangePreset } from "../../../packages/contracts/src/index";

export interface DemoConfig {
  scenarioId: string;
  preset: TimeRangePreset;
  hideTermsInReport: boolean;
  forceMaskedContent: boolean;
}

const defaultConfig: DemoConfig = {
  scenarioId: "normal-day",
  preset: "last-7-days",
  hideTermsInReport: true,
  forceMaskedContent: true
};

const validPresets = new Set<TimeRangePreset>([
  "today",
  "yesterday",
  "last-7-days",
  "last-30-days",
  "this-month",
  "custom",
  "all-time"
]);

export const parseDemoArgs = (argv: string[]): DemoConfig => {
  const config = { ...defaultConfig };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];

    if (token === "--scenario" && value) {
      config.scenarioId = value;
      index += 1;
      continue;
    }

    if (token === "--preset" && value) {
      if (!validPresets.has(value as TimeRangePreset)) {
        throw new Error(
          `Unsupported preset: ${value}. Expected one of ${[...validPresets].join(", ")}.`
        );
      }

      config.preset = value as TimeRangePreset;
      index += 1;
      continue;
    }

    if (token === "--show-terms") {
      config.hideTermsInReport = false;
      continue;
    }

    if (token === "--unmasked") {
      config.forceMaskedContent = false;
    }
  }

  return config;
};
