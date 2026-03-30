import type { LexiconFilterCategory, TimeRangePreset, ViewStatusCode } from "../../../../packages/contracts/src/index";
import { lexiconCategoryOptions, presetOptions, scenarioOptions } from "./app-config";

const presetLabelMap = new Map(presetOptions.map((option) => [option.value, option.label]));
const scenarioLabelMap = new Map(scenarioOptions.map((option) => [option.id, option.label]));
const lexiconCategoryLabelMap = new Map(
  lexiconCategoryOptions.map((option) => [option.value, option.label])
);

export const formatPresetLabel = (preset: TimeRangePreset): string =>
  presetLabelMap.get(preset) ?? preset;

export const formatScenarioLabel = (scenarioId: string): string =>
  scenarioLabelMap.get(scenarioId) ?? scenarioId;

export const formatLexiconCategoryLabel = (category: LexiconFilterCategory): string =>
  lexiconCategoryLabelMap.get(category) ?? category;

export const formatStatusCode = (code: ViewStatusCode): string => code;

export const formatCountLabel = (value: number, unit?: string): string =>
  unit ? `${value}${unit}` : String(value);

export const formatScenarioSummary = (scenarioId: string, preset: TimeRangePreset): string =>
  `${formatScenarioLabel(scenarioId)} · ${formatPresetLabel(preset)}`;
