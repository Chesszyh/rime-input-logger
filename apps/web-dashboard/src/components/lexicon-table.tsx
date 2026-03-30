interface LexiconRow {
  id: string;
  term: string;
  normalizedTerm: string;
  category: string;
  usageCount: number;
  source: string;
  firstSeenAt: string;
  lastSeenAt: string;
  status: string;
  notes?: string;
}

interface LexiconTableProps {
  title: string;
  rows: LexiconRow[];
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));

export const LexiconTable = ({ title, rows }: LexiconTableProps) => (
  <div className="lexicon-table">
    <div className="lexicon-table__scroll">
      <table className="lexicon-table__table" aria-label={title}>
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            <th scope="col">词条</th>
            <th scope="col">归一化</th>
            <th scope="col">分类</th>
            <th scope="col">次数</th>
            <th scope="col">来源</th>
            <th scope="col">首次出现</th>
            <th scope="col">最近出现</th>
            <th scope="col">状态</th>
            <th scope="col">备注</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.term}</th>
                <td>{row.normalizedTerm === row.term ? "—" : row.normalizedTerm}</td>
                <td>{row.category}</td>
                <td>{row.usageCount}</td>
                <td>{row.source}</td>
                <td>
                  <time dateTime={row.firstSeenAt}>{formatDateTime(row.firstSeenAt)}</time>
                </td>
                <td>
                  <time dateTime={row.lastSeenAt}>{formatDateTime(row.lastSeenAt)}</time>
                </td>
                <td>{row.status}</td>
                <td>{row.notes ?? "—"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9}>暂无词条</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
