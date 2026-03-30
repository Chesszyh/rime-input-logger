import type { ReportDashboardPage } from "../../../../../packages/dashboard/src/index";

export interface ReportViewModel {
  selectedTemplateTitle: string;
  selectedTemplateSummary: string;
  templateTitles: string[];
  selectedTemplateSections: Array<{
    title: string;
    summary: string;
  }>;
  exportFormats: ReportDashboardPage["exportEntry"]["formats"];
  textPreview: string[];
  contentMasked: boolean;
  visibleTopTerms: string[];
}

export const buildReportViewModel = (reportPage: ReportDashboardPage, textPreview: string[]): ReportViewModel => ({
  selectedTemplateTitle: reportPage.selectedTemplate.title,
  selectedTemplateSummary: reportPage.selectedTemplate.summary,
  templateTitles: reportPage.templates.map((template) => template.title),
  selectedTemplateSections: reportPage.selectedTemplate.sections.map((section) => ({
    title: section.title,
    summary: section.summary
  })),
  exportFormats: reportPage.exportEntry.formats,
  textPreview,
  contentMasked: reportPage.contentMasked,
  visibleTopTerms: reportPage.visibleTopTerms
});
