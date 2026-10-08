import { lazy, Suspense, useEffect, useState } from "react";
import type { JournalDashboardData } from "../server/journal-api";
import { groupJournalEntries } from "../../../packages/rime-journal/src/segments";
import { TagCloud } from "./components/tag-cloud";
import "./styles/journal.css";

const DemoApp = lazy(() =>
  import("./DemoApp").then((module) => ({ default: module.DemoApp })),
);
type Page = "daily" | "cloud" | "settings";
const pageNames: Record<Page, string> = {
  daily: "每日输入",
  cloud: "词云",
  settings: "数据设置",
};
const time = (value: string) =>
  new Date(value).toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
  });

export const App = () => {
  const [page, setPage] = useState<Page>("daily");
  const [source, setSource] = useState("local");
  const [rawDir, setRawDir] = useState(
    () => localStorage.getItem("rime-raw-dir") ?? "",
  );
  const [draftDir, setDraftDir] = useState(rawDir);
  const [date, setDate] = useState("");
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<JournalDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [grouped, setGrouped] = useState(true);
  const [gapSeconds, setGapSeconds] = useState(15);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ source, rawDir, date });
        const response = await fetch(`/api/journal?${params}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "读取失败");
        if (!controller.signal.aborted) {
          setData(result as JournalDashboardData);
          setError("");
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          timer = setTimeout(() => {
            void refresh();
          }, 5000);
        }
      }
    };
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [source, rawDir, date, revision]);

  useEffect(() => {
    setData(null);
    setError("");
  }, [source, rawDir, date]);

  useEffect(() => {
    setVisibleCount(50);
    setQuery("");
  }, [source, date, rawDir]);

  const changeSource = (value: string) => {
    setSource(value);
    setDate("");
  };
  const entries = data?.events.entries ?? [];
  const timeline = data?.activity?.timeline ?? entries;
  const displayEntries = grouped
    ? groupJournalEntries(timeline, gapSeconds)
    : timeline;
  const filtered = [...displayEntries]
    .reverse()
    .filter((entry) =>
      entry.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );
  const exportJson = () => {
    if (!data) return;
    const blob = new Blob(
      [
        JSON.stringify(
          page === "cloud"
            ? data.report
            : { ...data.events, activity: data.activity },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rime-${page}-${data.date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (demo)
    return (
      <>
        <button className="journal-demo-back" onClick={() => setDemo(false)}>
          ← 返回输入日记
        </button>
        <Suspense fallback={<p>正在加载演示…</p>}>
          <DemoApp />
        </Suspense>
      </>
    );

  return (
    <div className="journal-shell">
      <aside className="journal-sidebar">
        <a className="journal-brand" href="/">
          R
          <span>
            RIME JOURNAL<small>输入日记</small>
          </span>
        </a>
        <nav aria-label="主导航">
          {(Object.keys(pageNames) as Page[]).map((key, index) => (
            <button
              key={key}
              aria-current={page === key ? "page" : undefined}
              onClick={() => setPage(key)}
            >
              <span>0{index + 1}</span>
              {pageNames[key]}
            </button>
          ))}
        </nav>
        <div className="journal-source">
          <span className="journal-dot" />
          {source === "example" ? "示例数据" : "本机日志"}
          <small>仅在本机读取与分析</small>
        </div>
      </aside>
      <main className="journal-main">
        <header className="journal-header">
          <div>
            <p className="journal-kicker">你的文字，日积月累</p>
            <h1>{pageNames[page]}</h1>
          </div>
          <button
            onClick={() => setRevision((value) => value + 1)}
            disabled={loading}
          >
            {loading ? "读取中…" : "刷新"}
          </button>
        </header>
        {page !== "settings" && (
          <div className="journal-toolbar">
            <label>
              日期
              <input
                aria-label="日期"
                type="date"
                value={date || data?.date || ""}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <button
              onClick={() => {
                setDate("");
                if (source === "example") changeSource("local");
              }}
            >
              今天
            </button>
            <label>
              数据源
              <select
                value={source}
                onChange={(event) => changeSource(event.target.value)}
              >
                <option value="local">本机日志</option>
                <option value="example">示例数据</option>
              </select>
            </label>
            <button onClick={exportJson} disabled={!data}>
              导出 JSON
            </button>
          </div>
        )}
        {error && (
          <div className="journal-notice" role="alert">
            <strong>无法读取日志</strong>
            <p>{error}</p>
            <button onClick={() => setPage("settings")}>检查数据目录</button>
          </div>
        )}
        {loading && !data && <p role="status">正在读取日志…</p>}
        {page === "settings" ? (
          <section className="journal-card journal-settings">
            <h2>连接你的输入记录</h2>
            <p>
              填写采集器写入的 raw 目录。留空使用默认目录或 RIME_COMMIT_LOG_ROOT
              指定的目录。
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const value = draftDir.trim();
                localStorage.setItem("rime-raw-dir", value);
                setRawDir(value);
                changeSource("local");
                setRevision((n) => n + 1);
              }}
            >
              <label>
                日志目录
                <input
                  placeholder="留空使用默认目录"
                  value={draftDir}
                  onChange={(event) => setDraftDir(event.target.value)}
                />
              </label>
              <button type="submit">保存并读取</button>
            </form>
            {data && (
              <dl>
                <dt>当前目录</dt>
                <dd>{data.rawDir}</dd>
                <dt>读取状态</dt>
                <dd>
                  {data.exists
                    ? `找到 ${data.dates.length} 天的日志`
                    : "目录尚不存在"}
                </dd>
                <dt>日期时区</dt>
                <dd>Asia/Shanghai（UTC+8）</dd>
              </dl>
            )}
            <h2>还没有日志？</h2>
            <p>
              先体验示例，再按照仓库 docs/rime-journal.md 安装 Lua
              采集器并重新部署 Rime。安装后上屏一句文字，回到这里刷新。
            </p>
            <div className="journal-actions">
              <button
                onClick={() => {
                  changeSource("example");
                  setPage("daily");
                }}
              >
                查看示例日记
              </button>
              <button onClick={() => setDemo(true)}>打开分析演示</button>
            </div>
          </section>
        ) : (
          data && (
            <>
              {data.activity && (
                <p className="journal-group-note">
                  行为事件 {data.activity.events.length} 条 · 英文观察{" "}
                  {
                    data.activity.timeline.filter((item) => item.observed)
                      .length
                  }{" "}
                  条
                  {data.activity.errors.length
                    ? ` · 跳过 ${data.activity.errors.length} 行无效行为记录`
                    : ""}
                </p>
              )}
              <div className="journal-metrics">
                <section>
                  <span>上屏次数</span>
                  <strong>{entries.length.toLocaleString()}</strong>
                  <small>所选日期的原始记录</small>
                </section>
                <section>
                  <span>输入字符</span>
                  <strong>
                    {entries
                      .reduce((sum, entry) => sum + entry.charCount, 0)
                      .toLocaleString()}
                  </strong>
                  <small>按采集器记录计数</small>
                </section>
                <section>
                  <span>分析词次</span>
                  <strong>{data.report.totals.tokens.toLocaleString()}</strong>
                  <small>过滤后用于词频统计</small>
                </section>
              </div>
              {data.report.source.parseErrors.length > 0 && (
                <p className="journal-notice" role="status">
                  跳过 {data.report.source.parseErrors.length}{" "}
                  行无效日志（包含对照期）；导出词云 JSON 可查看错误位置。
                </p>
              )}
              {timeline.length === 0 ? (
                <section className="journal-card journal-empty">
                  <span>✎</span>
                  <h2>
                    {data.exists
                      ? "这一天还没有输入记录"
                      : "开始记录你的第一句话"}
                  </h2>
                  <p>
                    {data.exists
                      ? "选择已有日志的日期，或输入文字后刷新。"
                      : "连接日志目录，或先用示例体验每日输入和词云。"}
                  </p>
                  <div className="journal-actions">
                    <button onClick={() => setPage("settings")}>
                      设置数据目录
                    </button>
                    <button onClick={() => changeSource("example")}>
                      体验示例数据
                    </button>
                    {data.dates[0] && (
                      <button onClick={() => setDate(data.dates[0])}>
                        查看最近有记录的一天
                      </button>
                    )}
                  </div>
                </section>
              ) : page === "daily" ? (
                <section className="journal-card">
                  <div className="journal-section-head">
                    <h2>{grouped ? "连续片段" : "输入时间线"}</h2>
                    <span>
                      最新在前 ·{" "}
                      {time(timeline[timeline.length - 1].occurredAt)} 最后记录
                    </span>
                  </div>
                  <div className="journal-toolbar">
                    <label>
                      阅读方式
                      <select
                        value={grouped ? "grouped" : "raw"}
                        onChange={(event) => {
                          setGrouped(event.target.value === "grouped");
                          setVisibleCount(50);
                        }}
                      >
                        <option value="grouped">连续片段</option>
                        <option value="raw">原始上屏</option>
                      </select>
                    </label>
                    {grouped && (
                      <label>
                        断开间隔
                        <select
                          value={gapSeconds}
                          onChange={(event) => {
                            setGapSeconds(Number(event.target.value));
                            setVisibleCount(50);
                          }}
                        >
                          <option value={5}>5 秒</option>
                          <option value={15}>15 秒</option>
                          <option value={30}>30 秒</option>
                        </select>
                      </label>
                    )}
                  </div>
                  {grouped && (
                    <p className="journal-group-note">
                      按停顿、焦点及编辑边界拼接。英文观察未确认上屏，不计入上方统计。
                    </p>
                  )}
                  <input
                    className="journal-search"
                    aria-label="搜索输入"
                    placeholder="搜索这一天的文字"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setVisibleCount(50);
                    }}
                  />
                  <ol className="journal-timeline">
                    {filtered.slice(0, visibleCount).map((entry, index) => (
                      <li key={`${entry.occurredAt}-${index}`}>
                        <time>{time(entry.occurredAt)}</time>
                        <div>
                          <p>{entry.text}</p>
                          <small>
                            {entry.schemaId} · {entry.charCount} 字符
                            {"entries" in entry
                              ? ` · ${entry.entries.filter((item) => !item.observed).length} 次上屏 · ${entry.entries.filter((item) => item.observed).length} 次英文观察`
                              : entry.observed
                                ? " · 英文观察（未确认上屏）"
                                : ""}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {filtered.length === 0 && <p>没有匹配的输入。</p>}
                  {filtered.length > visibleCount && (
                    <button onClick={() => setVisibleCount((n) => n + 50)}>
                      再显示 50 条（剩余 {filtered.length - visibleCount} 条）
                    </button>
                  )}
                </section>
              ) : (
                <section className="journal-card journal-cloud">
                  <div className="journal-section-head">
                    <h2>这一天的关键词</h2>
                    <span>最多 20 个词 · 大小表示出现次数</span>
                  </div>
                  {data.report.wordCloud.length > 0 ? (
                    <>
                      <TagCloud
                        title="词频云"
                        points={data.report.wordCloud.map((point) => ({
                          label: point.term,
                          value: point.count,
                        }))}
                      />
                      <details>
                        <summary>查看词频明细</summary>
                        <table>
                          <thead>
                            <tr>
                              <th>词语</th>
                              <th>次数</th>
                              <th>占比</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.report.wordCloud.map((point) => (
                              <tr key={point.term}>
                                <td>{point.term}</td>
                                <td>{point.count}</td>
                                <td>{(point.share * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    </>
                  ) : (
                    <p>过滤后没有可统计的词语。可在每日输入查看原始记录。</p>
                  )}
                </section>
              )}
              <footer className="journal-footer">
                {source === "example" ? "合成示例" : "本机日志"} · {data.date} ·
                UTC+8
                <span>
                  每 5 秒刷新 · 读取于 {time(data.events.generatedAt)}
                </span>
              </footer>
            </>
          )
        )}
      </main>
    </div>
  );
};
