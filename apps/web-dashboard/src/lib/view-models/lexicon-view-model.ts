import type { LexiconEntry, LexiconOverview, LexiconFilterCategory } from "../../../../../packages/contracts/src/index";
import { formatLexiconCategoryLabel } from "../formatters";

export interface LexiconViewModel {
  overview: LexiconOverview;
  entries: LexiconEntry[];
  selectedCategory: LexiconFilterCategory;
  selectedCategoryLabel: string;
  highFrequencyNew: string[];
  lowFrequencyStale: string[];
  rimePreview: string[];
}

export const buildLexiconViewModel = (input: {
  overview: LexiconOverview;
  entries: LexiconEntry[];
  selectedCategory: LexiconFilterCategory;
  highFrequencyNew: LexiconEntry[];
  lowFrequencyStale: LexiconEntry[];
  rimePreview: string[];
}): LexiconViewModel => ({
  overview: input.overview,
  entries: input.entries,
  selectedCategory: input.selectedCategory,
  selectedCategoryLabel: formatLexiconCategoryLabel(input.selectedCategory),
  highFrequencyNew: input.highFrequencyNew.map((entry) => entry.term),
  lowFrequencyStale: input.lowFrequencyStale.map((entry) => entry.term),
  rimePreview: input.rimePreview
});
