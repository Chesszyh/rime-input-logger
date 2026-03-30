import { useEffect, useMemo, useState, startTransition } from "react";
import { AppShell } from "./components/app-shell";
import { EmptyStatePanel } from "./components/empty-state-panel";
import { ErrorBanner } from "./components/error-banner";
import { SectionCard } from "./components/section-card";
import { SidebarNav, type SidebarNavItem } from "./components/sidebar-nav";
import { StateBadge } from "./components/state-badge";
import { TopbarControls } from "./components/topbar-controls";
import {
  defaultDashboardSelection,
  pageOptions
} from "./lib/app-config";
import { loadDashboardWorkspace } from "./lib/dashboard-client";
import { formatScenarioSummary } from "./lib/formatters";
import type { DashboardPageKey } from "../../../packages/dashboard/src/index";
import type { ViewStatusCode } from "../../../packages/contracts/src/index";

export const App = () => {
  const [selection, setSelection] = useState(defaultDashboardSelection);
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof loadDashboardWorkspace>> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    scenarioId,
    preset,
    hideTermsInReport,
    forceMaskedContent,
    lexiconCategory
  } = selection;

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    loadDashboardWorkspace({
      scenarioId,
      preset,
      hideTermsInReport,
      forceMaskedContent,
      lexiconCategory
    })
      .then((nextWorkspace) => {
        if (cancelled) {
          return;
        }

        setWorkspace(nextWorkspace);
      })
      .catch((nextError: unknown) => {
        if (cancelled) {
          return;
        }

        const message = nextError instanceof Error ? nextError.message : String(nextError);
        setError(message);
        setWorkspace(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [forceMaskedContent, hideTermsInReport, lexiconCategory, preset, scenarioId]);

  const updateSelection = <Key extends keyof typeof selection>(
    key: Key,
    value: (typeof selection)[Key]
  ) => {
    startTransition(() => {
      setSelection((current) => ({
        ...current,
        [key]: value
      }));
    });
  };

  const navigationItems: SidebarNavItem[] = useMemo(
    () =>
      pageOptions.map((page) => {
        if (page.key === "lexicon") {
          return {
            key: page.key,
            label: page.label,
            description: "词条、分类、收藏和导出预览",
            stateCode:
              loading || !workspace
                ? "LOADING"
                : workspace.lexicon.overview.totalEntries > 0
                  ? "READY"
                  : "NO_DATA"
          };
        }

        const stateCode =
          loading || !workspace
            ? "LOADING"
            : workspace.dashboard.pages[page.key as DashboardPageKey]?.state.code ?? "ERROR";

        const descriptionByPage: Record<DashboardPageKey, string> = {
          overview: "仪表盘总览与关键摘要",
          stats: "趋势、会话和活跃度",
          vocabulary: "高频词、新词和变化",
          time: "时段分布与热力概览",
          report: "报告模板与导出预览"
        };

        return {
          key: page.key,
          label: page.label,
          description: descriptionByPage[page.key as DashboardPageKey],
          stateCode
        };
      }),
    [loading, workspace]
  );

  const activePageLabel =
    pageOptions.find((page) => page.key === selection.activePage)?.label ?? selection.activePage;

  const activePageState: ViewStatusCode | "LOADING" = (() => {
    if (loading) {
      return "LOADING";
    }

    if (!workspace) {
      return "ERROR";
    }

    if (selection.activePage === "lexicon") {
      return workspace.lexicon.overview.totalEntries > 0 ? "READY" : "NO_DATA";
    }

    return workspace.dashboard.pages[selection.activePage]?.state.code ?? "ERROR";
  })();

  const activePageCopy =
    selection.activePage === "lexicon"
      ? workspace
        ? `词库总量 ${workspace.lexicon.overview.totalEntries} 条，当前分类为 ${workspace.lexicon.selectedCategoryLabel}。`
        : "正在加载词库数据..."
      : workspace?.dashboard.pages[selection.activePage]?.emptyCopy ?? "正在加载数据...";

  const shellScenarioSummary =
    workspace?.selection.scenarioSummary ?? formatScenarioSummary(scenarioId, preset);

  return (
    <AppShell
      sidebar={
        <SidebarNav
          items={navigationItems}
          activeKey={selection.activePage}
          onSelect={(page) => updateSelection("activePage", page as typeof selection.activePage)}
          scenarioSummary={shellScenarioSummary}
          rangeLabel={workspace?.selection.rangeLabel ?? "..."}
          currentStateCode={activePageState}
        />
      }
      topbar={
        <TopbarControls
          scenarioId={selection.scenarioId}
          preset={selection.preset}
          lexiconCategory={selection.lexiconCategory}
          hideTermsInReport={selection.hideTermsInReport}
          forceMaskedContent={selection.forceMaskedContent}
          rangeLabel={workspace?.selection.rangeLabel ?? "..."}
          activePageLabel={activePageLabel}
          activeStateCode={activePageState}
          activeStateCopy={activePageCopy}
          onScenarioChange={(value) => updateSelection("scenarioId", value)}
          onPresetChange={(value) => updateSelection("preset", value)}
          onLexiconCategoryChange={(value) => updateSelection("lexiconCategory", value)}
          onHideTermsInReportChange={(value) => updateSelection("hideTermsInReport", value)}
          onForceMaskedContentChange={(value) => updateSelection("forceMaskedContent", value)}
        />
      }
    >
      <main className="dashboard-main" aria-label="Active page region">
        {error ? (
          <ErrorBanner
            title="Workspace load failed"
            message={error}
          >
            <p>{shellScenarioSummary}</p>
          </ErrorBanner>
        ) : null}

        {!workspace && !error ? (
          <EmptyStatePanel
            title="正在加载工作区"
            description="Shell 已经就绪，数据层正在拉取当前场景、时间范围和词库概览。"
          >
            <StateBadge code="LOADING" />
          </EmptyStatePanel>
        ) : null}

        {workspace ? (
          <>
            <SectionCard
              eyebrow="Active page"
              title={activePageLabel}
              description={activePageCopy}
              badge={<StateBadge code={activePageState} />}
            >
              <div className="dashboard-main__summary">
                <p>
                  <span>Scenario</span>
                  <strong>{workspace.selection.scenarioSummary}</strong>
                </p>
                <p>
                  <span>Range</span>
                  <strong>{workspace.selection.rangeLabel}</strong>
                </p>
                <p>
                  <span>Current status</span>
                  <strong>{activePageState}</strong>
                </p>
              </div>
            </SectionCard>

            <div className="dashboard-main__grid">
              <SectionCard
                eyebrow="Workspace"
                title="Workspace summary"
                description="在 Task 4 页面图表落地前，先保留可浏览的只读骨架。"
              >
                <div className="dashboard-main__metrics">
                  <div>
                    <span className="dashboard-main__metric-label">Total entries</span>
                    <strong>{workspace.lexicon.overview.totalEntries}</strong>
                  </div>
                  <div>
                    <span className="dashboard-main__metric-label">Selected category</span>
                    <strong>{workspace.lexicon.selectedCategoryLabel}</strong>
                  </div>
                  <div>
                    <span className="dashboard-main__metric-label">Report template</span>
                    <strong>{workspace.report.selectedTemplateTitle}</strong>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Report"
                title="Preview"
                description={workspace.report.selectedTemplateSummary}
              >
                <p className="dashboard-main__preview">{workspace.report.textPreview}</p>
              </SectionCard>
            </div>

            {activePageState === "NO_DATA" || activePageState === "EMPTY_RESULT" ? (
              <EmptyStatePanel
                title="当前页面暂无可展示数据"
                description={activePageCopy}
              />
            ) : null}
          </>
        ) : null}
      </main>
    </AppShell>
  );
};
