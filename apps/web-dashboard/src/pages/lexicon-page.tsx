import type { LexiconViewModel } from "../lib/view-models/lexicon-view-model";
import { LexiconTable } from "../components/lexicon-table";
import { MetricGrid } from "../components/metric-grid";
import { SectionCard } from "../components/section-card";

interface LexiconPageProps {
  lexicon: LexiconViewModel;
}

export const LexiconPage = ({ lexicon }: LexiconPageProps) => (
  <div className="page-stack">
    <SectionCard
      eyebrow="Lexicon"
      title="词库总览"
      description={`当前分类：${lexicon.selectedCategoryLabel}`}
    >
      <MetricGrid
        items={[
          { label: "词库总量", value: lexicon.overview.totalEntries },
          { label: "新词", value: lexicon.overview.newEntries },
          { label: "高频词", value: lexicon.overview.highFrequencyEntries },
          { label: "短语", value: lexicon.overview.phraseEntries }
        ]}
      />
    </SectionCard>

    <div className="page-grid">
      <SectionCard
        eyebrow="Highlights"
        title="高频新词"
        description="最近应重点确认和保留的词项。"
      >
        <ul className="term-list">
          {lexicon.highFrequencyNew.map((term) => (
            <li key={term} className="term-list__item">
              <strong>{term}</strong>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        eyebrow="Highlights"
        title="低频陈旧词"
        description="可能需要观察或清理的词项。"
      >
        <ul className="term-list">
          {lexicon.lowFrequencyStale.map((term) => (
            <li key={term} className="term-list__item">
              <strong>{term}</strong>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>

    <SectionCard
      eyebrow="Entries"
      title="词库条目"
      description={`当前列表 ${lexicon.entries.length} 条`}
    >
      <LexiconTable title="词库条目" rows={lexicon.entries} />
    </SectionCard>

    <SectionCard
      eyebrow="Export"
      title="Rime 导出预览"
      description="只读展示导出文本片段。"
    >
      <pre className="preview-block">{lexicon.rimePreview.join("\n")}</pre>
    </SectionCard>
  </div>
);
