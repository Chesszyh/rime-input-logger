import type { ReportViewModel } from "../lib/view-models/report-view-model";
import { SectionCard } from "../components/section-card";

interface ReportPageProps {
  report: ReportViewModel;
}

export const ReportPage = ({ report }: ReportPageProps) => (
  <div className="page-stack">
    <SectionCard
      eyebrow="Report"
      title="报告预览"
      description={report.selectedTemplateSummary}
    >
      <div className="report-meta">
        <p>
          <span>内容状态</span>
          <strong>{report.contentMasked ? "已脱敏" : "原文可见"}</strong>
        </p>
        <p>
          <span>导出格式</span>
          <strong>{report.exportFormats.join(" / ")}</strong>
        </p>
      </div>
    </SectionCard>

    <div className="page-grid">
      <SectionCard
        eyebrow="Templates"
        title="模板列表"
        description="根据当前时间范围自动选中报告模板。"
      >
        <ul className="term-list">
          {report.templateTitles.map((title) => (
            <li key={title} className="term-list__item">
              <strong>{title}</strong>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        eyebrow="Top terms"
        title="术语可见性"
        description="这里会跟随 hide terms 选项实时变化。"
      >
        <ul className="tag-list">
          {report.visibleTopTerms.map((term, index) => (
            <li key={`${term}-${index}`} className="tag-list__item">
              {term}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>

    <SectionCard
      eyebrow="Sections"
      title="章节摘要"
      description={`共 ${report.selectedTemplateSections.length} 个章节`}
    >
      <ul className="term-list">
        {report.selectedTemplateSections.map((section) => (
          <li key={section.title} className="term-list__item">
            <strong>{section.title}</strong>
            <span>{section.summary}</span>
          </li>
        ))}
      </ul>
    </SectionCard>

    <SectionCard
      eyebrow="Preview"
      title={report.selectedTemplateTitle}
      description="文本导出预览片段"
    >
      <pre className="preview-block">{report.textPreview.join("\n")}</pre>
    </SectionCard>
  </div>
);
