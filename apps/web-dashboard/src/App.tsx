import { useEffect, useState, startTransition } from "react";
import { loadDashboardWorkspace } from "./lib/dashboard-client";
import {
  defaultDashboardSelection,
  lexiconCategoryOptions,
  pageOptions,
  presetOptions,
  scenarioOptions
} from "./lib/app-config";

export const App = () => {
  const [selection, setSelection] = useState(defaultDashboardSelection);
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof loadDashboardWorkspace>> | null>(null);
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
  }, [
    forceMaskedContent,
    hideTermsInReport,
    lexiconCategory,
    preset,
    scenarioId
  ]);

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

  const activePageState = workspace?.dashboard.pages[selection.activePage].state.code ?? "LOADING";
  const activePageCopy = workspace?.dashboard.pages[selection.activePage].emptyCopy ?? "正在加载数据...";

  return (
    <main className="app-shell">
      <section className="hero-card" aria-labelledby="dashboard-title">
        <p className="eyebrow">Personal Input Analytics System</p>
        <h1 id="dashboard-title">Personal Input Analytics</h1>
        <p className="hero-copy">
          Local-first web dashboard scaffold for browsing analytics, vocabulary,
          time activity, lexicon, and reports.
        </p>

        <div className="control-row">
          <label>
            <span>Scenario</span>
            <select
              aria-label="scenario"
              value={selection.scenarioId}
              onChange={(event) =>
                updateSelection("scenarioId", event.target.value)
              }
            >
              {scenarioOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Preset</span>
            <select
              aria-label="preset"
              value={selection.preset}
              onChange={(event) =>
                updateSelection("preset", event.target.value as typeof selection.preset)
              }
            >
              {presetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Lexicon Category</span>
            <select
              aria-label="lexicon category"
              value={selection.lexiconCategory}
              onChange={(event) =>
                updateSelection(
                  "lexiconCategory",
                  event.target.value as typeof selection.lexiconCategory
                )
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

        <div className="control-row">
          <label>
            <input
              type="checkbox"
              checked={selection.hideTermsInReport}
              onChange={(event) =>
                updateSelection("hideTermsInReport", event.target.checked)
              }
            />
            Hide terms in report
          </label>

          <label>
            <input
              type="checkbox"
              checked={selection.forceMaskedContent}
              onChange={(event) =>
                updateSelection("forceMaskedContent", event.target.checked)
              }
            />
            Force masked content
          </label>
        </div>

        <div className="status-stack" aria-live="polite">
          <p>
            <span>Selected range: </span>
            <strong>{workspace?.selection.rangeLabel ?? "..."}</strong>
          </p>
          <p>
            <span>Current status: </span>
            <strong>{loading ? "LOADING" : activePageState}</strong>
          </p>
          <p>{activePageCopy}</p>
          <p>
            <span>Active page: </span>
            <strong>
              {pageOptions.find((page) => page.key === selection.activePage)?.label}
            </strong>
          </p>
          {error ? <p role="alert">{error}</p> : null}
        </div>

        {workspace ? (
          <div className="summary-grid">
            <section>
              <h2>Workspace</h2>
              <p>{workspace.selection.scenarioSummary}</p>
              <p>Total entries: {workspace.lexicon.overview.totalEntries}</p>
              <p>Selected category: {workspace.lexicon.selectedCategoryLabel}</p>
            </section>
            <section>
              <h2>Report</h2>
              <p>{workspace.report.selectedTemplateTitle}</p>
              <p>{workspace.report.selectedTemplateSummary}</p>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
};
