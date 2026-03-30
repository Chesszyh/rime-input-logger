import type { VocabularyDashboardPage } from "../../../../packages/dashboard/src/index";
import type { VocabularyInsight } from "../../../../packages/contracts/src/index";
import { ChartCard } from "../components/chart-card";
import { SectionCard } from "../components/section-card";
import { SimpleBarChart } from "../components/simple-bar-chart";
import { TagCloud } from "../components/tag-cloud";

interface VocabularyPageProps {
  page: VocabularyDashboardPage;
}

const renderTerms = (title: string, terms: VocabularyInsight[]) => (
  <SectionCard
    eyebrow="Terms"
    title={title}
    description={`共 ${terms.length} 个词项`}
  >
    <ul className="term-list">
      {terms.map((term) => (
        <li key={term.id} className="term-list__item">
          <strong>{term.term}</strong>
          <span>
            {term.count} 次
            {term.deltaFromPrevious !== 0 ? ` · 变化 ${term.deltaFromPrevious}` : ""}
          </span>
        </li>
      ))}
    </ul>
  </SectionCard>
);

export const VocabularyPage = ({ page }: VocabularyPageProps) => (
  <div className="page-stack">
    <div className="page-grid">
      <ChartCard title={page.topTermsChart.title} description={page.topTermsChart.description}>
        <SimpleBarChart
          ariaLabel={page.topTermsChart.title}
          unit={page.topTermsChart.unit}
          points={page.topTermsChart.points}
        />
      </ChartCard>

      <ChartCard title={page.wordCloud.title} description={page.wordCloud.description}>
        <TagCloud title={page.wordCloud.title} points={page.wordCloud.points} />
      </ChartCard>
    </div>

    <div className="page-grid page-grid--three">
      {renderTerms("高频词", page.topTerms)}
      {renderTerms("新词", page.newTerms)}
      {renderTerms("短语词", page.phraseTerms)}
    </div>
  </div>
);
