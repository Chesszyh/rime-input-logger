import type {
  LexiconFilterCategory,
  TimeRangePreset,
  ViewStatusCode
} from "../../../../packages/contracts/src/index";
import {
  lexiconCategoryOptions,
  presetOptions,
  scenarioOptions
} from "../lib/app-config";
import { StateBadge } from "./state-badge";

interface TopbarControlsProps {
  scenarioId: string;
  preset: TimeRangePreset;
  lexiconCategory: LexiconFilterCategory;
  hideTermsInReport: boolean;
  forceMaskedContent: boolean;
  rangeLabel: string;
  activePageLabel: string;
  activeStateCode: ViewStatusCode | "LOADING";
  activeStateCopy: string;
  onScenarioChange: (value: string) => void;
  onPresetChange: (value: TimeRangePreset) => void;
  onLexiconCategoryChange: (value: LexiconFilterCategory) => void;
  onHideTermsInReportChange: (value: boolean) => void;
  onForceMaskedContentChange: (value: boolean) => void;
}

export const TopbarControls = ({
  scenarioId,
  preset,
  lexiconCategory,
  hideTermsInReport,
  forceMaskedContent,
  rangeLabel,
  activePageLabel,
  activeStateCode,
  activeStateCopy,
  onScenarioChange,
  onPresetChange,
  onLexiconCategoryChange,
  onHideTermsInReportChange,
  onForceMaskedContentChange
}: TopbarControlsProps) => (
  <section className="topbar-controls" aria-label="Global controls">
    <div className="topbar-controls__grid">
      <label className="topbar-controls__field">
        <span className="topbar-controls__label">Scenario</span>
        <select
          aria-label="scenario"
          value={scenarioId}
          onChange={(event) => onScenarioChange(event.target.value)}
        >
          {scenarioOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="topbar-controls__field">
        <span className="topbar-controls__label">Preset</span>
        <select
          aria-label="preset"
          value={preset}
          onChange={(event) => onPresetChange(event.target.value as TimeRangePreset)}
        >
          {presetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="topbar-controls__field">
        <span className="topbar-controls__label">Lexicon category</span>
        <select
          aria-label="lexicon category"
          value={lexiconCategory}
          onChange={(event) =>
            onLexiconCategoryChange(event.target.value as LexiconFilterCategory)
          }
        >
          {lexiconCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>

    <div className="topbar-controls__toggles">
      <label className="topbar-controls__toggle">
        <input
          type="checkbox"
          checked={hideTermsInReport}
          onChange={(event) => onHideTermsInReportChange(event.target.checked)}
        />
        <span>Hide terms in report</span>
      </label>

      <label className="topbar-controls__toggle">
        <input
          type="checkbox"
          checked={forceMaskedContent}
          onChange={(event) => onForceMaskedContentChange(event.target.checked)}
        />
        <span>Force masked content</span>
      </label>
    </div>

    <div className="topbar-controls__meta" aria-live="polite">
      <div className="topbar-controls__meta-block">
        <span className="topbar-controls__meta-label">Current page</span>
        <strong>{activePageLabel}</strong>
      </div>
      <div className="topbar-controls__meta-block">
        <span className="topbar-controls__meta-label">Range</span>
        <strong>{rangeLabel}</strong>
      </div>
      <div className="topbar-controls__meta-block">
        <span className="topbar-controls__meta-label">Status</span>
        <StateBadge code={activeStateCode} />
      </div>
      <p className="topbar-controls__copy">{activeStateCopy}</p>
    </div>
  </section>
);
