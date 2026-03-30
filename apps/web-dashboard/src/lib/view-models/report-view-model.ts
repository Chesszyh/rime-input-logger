import type { ReportDashboardPage } from "../../../../../packages/dashboard/src/index";

export interface ReportViewModel {
  selectedTemplateTitle: string;
  selectedTemplateSummary: string;
  exportFormats: ReportDashboardPage["exportEntry"]["formats"];
  textPreview: string[];
  contentMasked: boolean;
  visibleTopTerms: string[];
}

export const buildReportViewModel = (reportPage: ReportDashboardPage, textPreview: string[]): ReportViewModel => ({
  selectedTemplateTitle: reportPage.selectedTemplate.title,
  selectedTemplateSummary: reportPage.selectedTemplate.summary,
  exportFormats: reportPage.exportEntry.formats,
  textPreview,
  contentMasked: reportPage.contentMasked,
  visibleTopTerms: reportPage.visibleTopTerms
});
