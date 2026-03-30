import type { ViewStatusCode } from "../../../../packages/contracts/src/index";
import { StateBadge } from "./state-badge";

export interface SidebarNavItem {
  key: string;
  label: string;
  description: string;
  stateCode: ViewStatusCode | "LOADING";
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  scenarioSummary: string;
  rangeLabel: string;
  currentStateCode: ViewStatusCode | "LOADING";
}

export const SidebarNav = ({
  items,
  activeKey,
  onSelect,
  scenarioSummary,
  rangeLabel,
  currentStateCode
}: SidebarNavProps) => (
  <nav className="sidebar-nav" aria-label="Primary">
    <div className="sidebar-nav__brand">
      <p className="sidebar-nav__eyebrow">Local-first dashboard</p>
      <h1 className="sidebar-nav__title">Personal Input Analytics</h1>
      <p className="sidebar-nav__description">
        浏览总览、词汇、时间、词库和报告状态。
      </p>
    </div>

    <div className="sidebar-nav__summary">
      <div>
        <span className="sidebar-nav__label">Scenario</span>
        <strong>{scenarioSummary}</strong>
      </div>
      <div>
        <span className="sidebar-nav__label">Range</span>
        <strong>{rangeLabel}</strong>
      </div>
      <div className="sidebar-nav__status">
        <span className="sidebar-nav__label">Current status</span>
        <StateBadge code={currentStateCode} />
      </div>
    </div>

    <ul className="sidebar-nav__list">
      {items.map((item) => (
        <li key={item.key} className="sidebar-nav__item">
          <button
            type="button"
            className="sidebar-nav__button"
            aria-current={item.key === activeKey ? "page" : undefined}
            onClick={() => onSelect(item.key)}
          >
            <span className="sidebar-nav__button-heading">
              <span>{item.label}</span>
              <StateBadge code={item.stateCode} />
            </span>
            <span className="sidebar-nav__button-description">{item.description}</span>
          </button>
        </li>
      ))}
    </ul>
  </nav>
);
