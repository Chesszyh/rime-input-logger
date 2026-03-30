import type {
  InputSession,
  SessionSummary
} from "../../contracts/src/index";

export const summarizeSessions = (sessions: InputSession[]): SessionSummary => {
  if (sessions.length === 0) {
    return {
      count: 0,
      averageDurationSeconds: 0,
      longestDurationSeconds: 0,
      focusSessionCount: 0
    };
  }

  const totalDuration = sessions.reduce(
    (sum, item) => sum + item.durationSeconds,
    0
  );
  const longestDurationSeconds = sessions.reduce(
    (max, item) => Math.max(max, item.durationSeconds),
    0
  );

  return {
    count: sessions.length,
    averageDurationSeconds: Math.round(totalDuration / sessions.length),
    longestDurationSeconds,
    focusSessionCount: sessions.filter((item) => item.intensity === "deep-focus").length
  };
};
