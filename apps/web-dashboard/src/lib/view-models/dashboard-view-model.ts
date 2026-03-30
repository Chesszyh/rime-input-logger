import type { DashboardExperience, DashboardPageKey } from "../../../../../packages/dashboard/src/index";
import type { ViewStatusCode } from "../../../../../packages/contracts/src/index";

export interface DashboardShellViewModel {
  navigation: DashboardExperience["navigation"];
  activePage: DashboardPageKey;
  activePageState: ViewStatusCode;
  activePageTitle: string;
  activePageCopy: string;
  rangeLabel: string;
}

export const buildDashboardShellViewModel = (
  dashboard: DashboardExperience,
  activePage: DashboardPageKey,
  rangeLabel: string
): DashboardShellViewModel => {
  const page = dashboard.pages[activePage];

  return {
    navigation: dashboard.navigation,
    activePage,
    activePageState: page.state.code,
    activePageTitle: page.title,
    activePageCopy: page.emptyCopy,
    rangeLabel
  };
};
