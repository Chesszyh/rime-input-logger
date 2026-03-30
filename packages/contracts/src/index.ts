export type ISODateString = string;
export type ISODateTimeString = string;

export type TimeRangePreset =
  | "today"
  | "yesterday"
  | "last-7-days"
  | "last-30-days"
  | "this-month"
  | "custom"
  | "all-time";

export type AppScreeningScope = "allow" | "blocked" | "ignored";
export type PrivacyMode = "store-raw" | "store-masked" | "stats-only";
export type SessionIntensity = "light" | "normal" | "deep-focus";
export type VocabularyInsightKind =
  | "top"
  | "new"
  | "rising"
  | "falling"
  | "stable"
  | "phrase";
export type LexiconEntryStatus =
  | "active"
  | "favorite"
  | "archived"
  | "ignored"
  | "deleted";
export type ReportSectionKind =
  | "overview"
  | "trend"
  | "vocabulary"
  | "time-activity"
  | "lexicon"
  | "governance";

export type ViewStatusCode =
  | "READY"
  | "NO_DATA"
  | "EMPTY_RESULT"
  | "PERMISSION_DENIED"
  | "PAUSED"
  | "ERROR";

export interface TimeRange {
  preset: TimeRangePreset;
  startAt?: ISODateTimeString;
  endAt?: ISODateTimeString;
  timezone: string;
  label: string;
}

export interface ViewState {
  code: ViewStatusCode;
  title: string;
  description: string;
  recommendedAction?: string;
}

export interface OperationError {
  code:
    | "INVALID_RANGE"
    | "PERMISSION_DENIED"
    | "NOT_FOUND"
    | "CONFLICT"
    | "EMPTY_PAYLOAD"
    | "CONFIRMATION_REQUIRED";
  message: string;
  details?: Record<string, unknown>;
}

export interface OperationEnvelope<TInput, TOutput> {
  requestId: string;
  operation:
    | "delete-records"
    | "retain-records"
    | "export-records"
    | "mask-content"
    | "refresh-analysis";
  input: TInput;
  output?: TOutput;
  success: boolean;
  errors: OperationError[];
  performedAt: ISODateTimeString;
}

export interface InputRecordEvent {
  id: string;
  occurredAt: ISODateTimeString;
  dateKey: ISODateString;
  timezone: string;
  schemaVersion: "1.0";
  source: "rime" | "mock";
  appId: string;
  appName: string;
  scope: AppScreeningScope;
  sessionId: string | null;
  rawText: string | null;
  maskedText: string | null;
  normalizedText: string;
  textLanguage: "zh-CN" | "en-US" | "mixed";
  charCount: number;
  tokenCount: number;
  candidateIndex: number | null;
  isDeleted: boolean;
  isFiltered: boolean;
  filterReasons: string[];
  tags: string[];
}

export interface InputSession {
  id: string;
  startedAt: ISODateTimeString;
  endedAt: ISODateTimeString;
  dateKey: ISODateString;
  timezone: string;
  eventIds: string[];
  totalChars: number;
  totalTokens: number;
  durationSeconds: number;
  idleGapSeconds: number;
  crossedMidnight: boolean;
  intensity: SessionIntensity;
}

export interface MetricCard {
  key:
    | "input-chars"
    | "input-entries"
    | "active-days"
    | "streak-days"
    | "latest-input"
    | "lexicon-size"
    | "new-terms";
  label: string;
  value: number | string;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
}

export interface TrendPoint {
  bucket: string;
  chars: number;
  entries: number;
  tokens: number;
}

export interface HourlyBucket {
  hour: number;
  chars: number;
  entries: number;
}

export interface HeatmapCell {
  dateKey: ISODateString;
  bucketLabel: string;
  chars: number;
}

export interface SessionSummary {
  count: number;
  averageDurationSeconds: number;
  longestDurationSeconds: number;
  focusSessionCount: number;
}

export interface StatsSnapshot {
  range: TimeRange;
  metrics: MetricCard[];
  timeline: TrendPoint[];
  hourlyBuckets: HourlyBucket[];
  heatmap: HeatmapCell[];
  sessionSummary: SessionSummary;
  highlights: string[];
}

export interface VocabularyInsight {
  id: string;
  term: string;
  normalizedTerm: string;
  kind: VocabularyInsightKind;
  count: number;
  share: number;
  deltaFromPrevious: number;
  firstSeenAt: ISODateTimeString;
  lastSeenAt: ISODateTimeString;
  isStopWord: boolean;
  sourceEventIds: string[];
}

export interface LexiconEntry {
  id: string;
  term: string;
  normalizedTerm: string;
  category:
    | "general"
    | "phrase"
    | "domain"
    | "low-frequency"
    | "noise";
  status: LexiconEntryStatus;
  firstSeenAt: ISODateTimeString;
  lastSeenAt: ISODateTimeString;
  usageCount: number;
  source: "analysis" | "manual";
  notes?: string;
}

export type LexiconFilterCategory =
  | "all"
  | "high-frequency"
  | "new"
  | "low-frequency-stale"
  | "phrase"
  | "favorite"
  | "ignored"
  | "deleted"
  | "domain"
  | "general"
  | "noise";

export type LexiconSortBy =
  | "usage-count"
  | "first-seen"
  | "last-seen"
  | "term";

export type LexiconSortOrder = "asc" | "desc";

export type LexiconMutationAction =
  | "favorite"
  | "unfavorite"
  | "delete"
  | "restore"
  | "ignore"
  | "unignore"
  | "mark-phrase"
  | "set-category";

export type LexiconExportFormat = "json" | "tsv" | "rime";

export interface LexiconOverview {
  totalEntries: number;
  newEntries: number;
  highFrequencyEntries: number;
  lowFrequencyStaleEntries: number;
  phraseEntries: number;
  favoriteEntries: number;
  ignoredEntries: number;
  deletedEntries: number;
}

export interface LexiconQuery {
  category: LexiconFilterCategory;
  search: string;
  sortBy: LexiconSortBy;
  sortOrder: LexiconSortOrder;
  limit?: number;
  offset?: number;
  referenceAt?: ISODateTimeString;
}

export interface LexiconListResult {
  entries: LexiconEntry[];
  total: number;
}

export interface LexiconMutationRequest {
  action: LexiconMutationAction;
  entryIds: string[];
  category?: LexiconEntry["category"];
}

export interface LexiconMutationResult {
  action: LexiconMutationAction;
  updatedCount: number;
  entries: LexiconEntry[];
  warnings: string[];
}

export interface LexiconExportRequest {
  format: LexiconExportFormat;
  category: LexiconFilterCategory;
  entryIds?: string[];
  search?: string;
  referenceAt?: ISODateTimeString;
}

export interface LexiconExportResult {
  format: LexiconExportFormat;
  content: string;
  exportedCount: number;
  generatedAt: ISODateTimeString;
  scenarioId: string;
}

export interface MigrationGuide {
  format: LexiconExportFormat;
  title: string;
  steps: string[];
  notes: string[];
}

export interface LexiconScenarioRequest {
  scenarioId: string;
  referenceAt?: ISODateTimeString;
}

export interface LexiconListRequest {
  scenarioId: string;
  query: LexiconQuery;
}

export interface LexiconMutationOperation {
  scenarioId: string;
  request: LexiconMutationRequest;
}

export interface LexiconExportOperation {
  scenarioId: string;
  request: LexiconExportRequest;
}

export interface LexiconMigrationGuideRequest {
  scenarioId: string;
  format: LexiconExportFormat;
}

export interface ReportSection {
  id: string;
  kind: ReportSectionKind;
  title: string;
  summary: string;
}

export interface AnalyticsReport {
  id: string;
  createdAt: ISODateTimeString;
  range: TimeRange;
  title: string;
  summary: string;
  sections: ReportSection[];
  contentMasked: boolean;
}

export interface RetentionPolicy {
  mode: PrivacyMode;
  retentionDays: number | null;
  autoArchive: boolean;
  exportMaskingEnabled: boolean;
}

export interface FilterRule {
  id: string;
  type: "app" | "term" | "regex";
  pattern: string;
  enabled: boolean;
  reason: string;
}

export interface UserSettings {
  recordingEnabled: boolean;
  paused: boolean;
  pauseReason?: string;
  retention: RetentionPolicy;
  filterRules: FilterRule[];
  stopWords: string[];
  sessionGapSeconds: number;
}

export type GovernanceNoticeLevel = "info" | "warning" | "critical";

export interface GovernanceNotice {
  id: string;
  level: GovernanceNoticeLevel;
  title: string;
  message: string;
}

export interface GovernanceConfirmationPolicy {
  deleteRequiresConfirmation: boolean;
  deleteAllRequiresSecondConfirmation: boolean;
  exportDefaultsToMasked: boolean;
}

export interface GovernanceScenarioRequest {
  scenarioId: string;
}

export interface GovernancePauseRequest extends GovernanceScenarioRequest {
  reason: string;
}

export interface GovernanceDeleteRequest extends GovernanceScenarioRequest {
  scope: "day" | "range" | "all";
  dateKey?: ISODateString;
  startAt?: ISODateTimeString;
  endAt?: ISODateTimeString;
  confirmed: boolean;
  secondConfirmed?: boolean;
}

export interface GovernanceRetainRequest extends GovernanceScenarioRequest {
  mode: PrivacyMode;
  retentionDays: number | null;
  autoArchive: boolean;
  exportMaskingEnabled: boolean;
  confirmed: boolean;
}

export interface GovernanceExportRequest extends GovernanceScenarioRequest {
  format: "json" | "text";
  maskContent?: boolean;
}

export interface GovernanceExportOutput {
  format: "json" | "text";
  masked: boolean;
  exportedRecords: number;
  sample: string[];
}

export interface GovernanceRuleUpsertRequest extends GovernanceScenarioRequest {
  rule: FilterRule;
}

export interface GovernanceRecordingSwitchRequest extends GovernanceScenarioRequest {
  enabled: boolean;
  reason?: string;
}

export interface GovernanceStopWordsRequest extends GovernanceScenarioRequest {
  stopWords: string[];
}

export interface GovernanceSettingsCenter {
  settings: UserSettings;
  lastOperation: OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;
  recordingScopeSummary: string;
  retentionSummary: string;
  notices: GovernanceNotice[];
  confirmationPolicy: GovernanceConfirmationPolicy;
}

export interface OverviewPageData {
  range: TimeRange;
  viewState: ViewState;
  metrics: MetricCard[];
  highlights: string[];
  timeline: TrendPoint[];
}

export interface VocabularyPageData {
  range: TimeRange;
  viewState: ViewState;
  topTerms: VocabularyInsight[];
  newTerms: VocabularyInsight[];
  risingTerms: VocabularyInsight[];
  fallingTerms: VocabularyInsight[];
  phraseTerms: VocabularyInsight[];
}

export interface TimeActivityPageData {
  range: TimeRange;
  viewState: ViewState;
  hourlyBuckets: HourlyBucket[];
  heatmap: HeatmapCell[];
  sessions: SessionSummary;
}

export interface GovernancePageData {
  settings: UserSettings;
  lastOperation: OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;
  viewState: ViewState;
}

export interface DashboardBootstrap {
  scenarioId: string;
  overview: OverviewPageData;
  vocabulary: VocabularyPageData;
  timeActivity: TimeActivityPageData;
  governance: GovernancePageData;
  report: AnalyticsReport;
}

export interface FixtureScenario {
  id: string;
  title: string;
  description: string;
  range: TimeRange;
  viewState: ViewState;
  records: InputRecordEvent[];
  sessions: InputSession[];
  stats: StatsSnapshot;
  vocabulary: VocabularyInsight[];
  lexicon: LexiconEntry[];
  report: AnalyticsReport;
  settings: UserSettings;
  lastOperation: OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;
}

export interface DashboardQuery {
  preset: TimeRangePreset;
  scenarioId: string;
}

export interface RawInputRecord {
  id: string;
  occurredAt: ISODateTimeString;
  appId: string;
  appName: string;
  text: string;
  source?: InputRecordEvent["source"];
  candidateIndex?: number | null;
  tags?: string[];
  manualIgnore?: boolean;
}

export interface IngestionDroppedRecord {
  id: string;
  reason: "recording-disabled" | "recording-paused" | "invalid-occurredAt" | "duplicate-input";
}

export interface DailyRecordArchive {
  dateKey: ISODateString;
  eventIds: string[];
  activeEventIds: string[];
  filteredEventIds: string[];
  sessionIds: string[];
}

export interface IngestionResult {
  events: InputRecordEvent[];
  sessions: InputSession[];
  dailyRecords: DailyRecordArchive[];
  dropped: IngestionDroppedRecord[];
}

export interface IngestionReadQuery {
  preset: TimeRangePreset;
  timezone: string;
  nowAt?: ISODateTimeString;
  startAt?: ISODateTimeString;
  endAt?: ISODateTimeString;
}
