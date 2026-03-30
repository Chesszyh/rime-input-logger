import type {
  LexiconFilterCategory,
  TimeRangePreset
} from "../../../../packages/contracts/src/index";
import type { DashboardPageKey } from "../../../../packages/dashboard/src/index";

export type DashboardShellPageKey = DashboardPageKey | "lexicon";

export interface ScenarioOption {
  id: string;
  label: string;
  description: string;
}

export interface PresetOption {
  value: TimeRangePreset;
  label: string;
}

export interface LexiconCategoryOption {
  value: LexiconFilterCategory;
  label: string;
}

export interface DashboardSelectionState {
  scenarioId: string;
  preset: TimeRangePreset;
  hideTermsInReport: boolean;
  forceMaskedContent: boolean;
  lexiconCategory: LexiconFilterCategory;
  activePage: DashboardShellPageKey;
}

export const scenarioOptions: ScenarioOption[] = [
  {
    id: "normal-day",
    label: "普通日",
    description: "典型日常输入与常规词汇"
  },
  {
    id: "empty-history",
    label: "空数据",
    description: "首次使用或尚未记录"
  },
  {
    id: "power-user-day",
    label: "高活跃日",
    description: "高强度输入与长会话"
  },
  {
    id: "filtered-day",
    label: "过滤日",
    description: "包含被过滤内容的场景"
  }
];

export const presetOptions: PresetOption[] = [
  { value: "today", label: "今天" },
  { value: "yesterday", label: "昨天" },
  { value: "last-7-days", label: "近 7 天" },
  { value: "last-30-days", label: "近 30 天" },
  { value: "this-month", label: "本月" },
  { value: "custom", label: "自定义" },
  { value: "all-time", label: "全部时间" }
];

export const lexiconCategoryOptions: LexiconCategoryOption[] = [
  { value: "all", label: "全部" },
  { value: "high-frequency", label: "高频" },
  { value: "new", label: "新词" },
  { value: "low-frequency-stale", label: "陈旧" },
  { value: "phrase", label: "短语" },
  { value: "favorite", label: "收藏" },
  { value: "ignored", label: "忽略" },
  { value: "deleted", label: "已删除" },
  { value: "domain", label: "领域" },
  { value: "general", label: "通用" },
  { value: "noise", label: "噪声" }
];

export const pageOptions: Array<{ key: DashboardShellPageKey; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "stats", label: "统计" },
  { key: "vocabulary", label: "词汇" },
  { key: "time", label: "时间" },
  { key: "lexicon", label: "词库" },
  { key: "report", label: "报告" }
];

export const defaultDashboardSelection: DashboardSelectionState = {
  scenarioId: "normal-day",
  preset: "last-7-days",
  hideTermsInReport: true,
  forceMaskedContent: true,
  lexiconCategory: "all",
  activePage: "overview"
};
