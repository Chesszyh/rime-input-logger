import type {
  InputRecordEvent,
  VocabularyInsight
} from "../../contracts/src/index";

const MAX_INSIGHTS = 20;
const BUILTIN_STOP_WORDS = new Set([
  "今天",
  "最近",
  "需要",
  "至少",
  "先",
  "把",
  "和",
  "要",
  "下来",
  "起来"
]);

interface CountSummary {
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceEventIds: Set<string>;
}

interface ExtractedVocabulary {
  terms: Map<string, CountSummary>;
  phrases: Map<string, CountSummary>;
}

export interface VocabularyAnalysisInput {
  currentEvents: InputRecordEvent[];
  previousEvents: InputRecordEvent[];
  stopWords: string[];
}

export interface VocabularyAnalysisResult {
  topTerms: VocabularyInsight[];
  newTerms: VocabularyInsight[];
  risingTerms: VocabularyInsight[];
  fallingTerms: VocabularyInsight[];
  phraseTerms: VocabularyInsight[];
}

const usableEvent = (event: InputRecordEvent): boolean =>
  !event.isDeleted && !event.isFiltered && event.normalizedText.trim().length > 0;

const delimiterPattern = /[\s,，。.!！?？;；:：、()（）\[\]{}"'“”‘’<>《》]+/u;
const noiseTokenPattern = /^[\p{P}\p{S}\d_]+$/u;
const singleHanPattern = /^[\p{Script=Han}]$/u;
const hasHanPattern = /\p{Script=Han}/u;

const rankingLowSignalChars = new Set([
  "今",
  "天",
  "最",
  "近",
  "需",
  "要",
  "先",
  "下",
  "来",
  "至",
  "少",
  "和",
  "把"
]);

const wordSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("zh-CN", { granularity: "word" })
    : null;

const normalizeTerm = (term: string): string => term.trim().toLowerCase();

const tokenizeByDelimiter = (text: string): string[] =>
  text
    .split(delimiterPattern)
    .map((item) => item.trim())
    .filter(Boolean);

const segmentWords = (text: string): string[] => {
  if (!wordSegmenter) {
    return tokenizeByDelimiter(text);
  }

  const segments = [...wordSegmenter.segment(text)]
    .filter((segment) => segment.isWordLike)
    .map((segment) => segment.segment.trim())
    .filter(Boolean);

  const merged: string[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const current = segments[index];

    if (!singleHanPattern.test(current)) {
      merged.push(current);
      continue;
    }

    let run = current;
    let cursor = index + 1;
    while (cursor < segments.length && singleHanPattern.test(segments[cursor])) {
      run += segments[cursor];
      cursor += 1;
    }

    if (run.length >= 2) {
      merged.push(run);
    }

    index = cursor - 1;
  }

  return merged;
};

const toCandidateTokens = (text: string): string[] => {
  const splitTokens = tokenizeByDelimiter(text);
  const segmentedTokens = segmentWords(text);

  if (splitTokens.length > 1) {
    return splitTokens.filter((token) => !noiseTokenPattern.test(token));
  }

  return segmentedTokens.filter((token) => !noiseTokenPattern.test(token));
};

const isBlockedToken = (token: string, stopWords: Set<string>): boolean => {
  const normalized = normalizeTerm(token);

  return (
    normalized.length === 0 ||
    stopWords.has(normalized) ||
    BUILTIN_STOP_WORDS.has(normalized) ||
    noiseTokenPattern.test(token)
  );
};

const isUsableTermToken = (token: string, stopWords: Set<string>): boolean =>
  token.length >= 2 && !isBlockedToken(token, stopWords);

const pushCount = (
  map: Map<string, CountSummary>,
  term: string,
  event: InputRecordEvent
): void => {
  const normalized = normalizeTerm(term);
  if (!normalized) {
    return;
  }

  const existing = map.get(normalized);

  if (!existing) {
    map.set(normalized, {
      count: 1,
      firstSeenAt: event.occurredAt,
      lastSeenAt: event.occurredAt,
      sourceEventIds: new Set([event.id])
    });
    return;
  }

  existing.count += 1;
  if (event.occurredAt < existing.firstSeenAt) {
    existing.firstSeenAt = event.occurredAt;
  }
  if (event.occurredAt > existing.lastSeenAt) {
    existing.lastSeenAt = event.occurredAt;
  }
  existing.sourceEventIds.add(event.id);
};

const countLowSignalCharacters = (term: string): number => {
  let total = 0;

  for (const char of term) {
    if (rankingLowSignalChars.has(char)) {
      total += 1;
    }
  }

  return total;
};

const toSortedEntries = (
  map: Map<string, CountSummary>
): Array<[string, CountSummary]> =>
  [...map.entries()].sort((left, right) => {
    const countDiff = right[1].count - left[1].count;
    if (countDiff !== 0) {
      return countDiff;
    }

    const lowSignalDiff =
      countLowSignalCharacters(left[0]) - countLowSignalCharacters(right[0]);
    if (lowSignalDiff !== 0) {
      return lowSignalDiff;
    }

    const lengthDiff = right[0].length - left[0].length;
    if (lengthDiff !== 0) {
      return lengthDiff;
    }

    return left[0].localeCompare(right[0], "zh-Hans-CN");
  });

const toInsight = (
  kind: VocabularyInsight["kind"],
  term: string,
  count: number,
  totalCount: number,
  deltaFromPrevious: number,
  firstSeenAt: string,
  lastSeenAt: string,
  sourceEventIds: string[]
): VocabularyInsight => ({
  id: `${kind}-${term}`,
  term,
  normalizedTerm: normalizeTerm(term),
  kind,
  count,
  share: totalCount === 0 ? 0 : Number((count / totalCount).toFixed(4)),
  deltaFromPrevious,
  firstSeenAt,
  lastSeenAt,
  isStopWord: false,
  sourceEventIds
});

const joinPhraseParts = (parts: string[]): string =>
  parts.some((part) => hasHanPattern.test(part))
    ? parts.join("")
    : parts.join(" ");

const buildPhraseCandidates = (
  tokens: string[],
  stopWords: Set<string>
): string[] => {
  const usableTokens = tokens.filter((token) => !isBlockedToken(token, stopWords));
  const phrases = new Set<string>();

  usableTokens.forEach((token) => {
    if (token.length >= 4) {
      phrases.add(token);
    }
  });

  for (let index = 0; index < usableTokens.length; index += 1) {
    for (let width = 2; width <= 3; width += 1) {
      const parts = usableTokens.slice(index, index + width);
      if (parts.length !== width) {
        continue;
      }

      const phrase = joinPhraseParts(parts);
      if (phrase.length < 4 || phrase.length > 8) {
        continue;
      }

      phrases.add(phrase);
    }
  }

  return [...phrases];
};

const extractVocabulary = (
  events: InputRecordEvent[],
  stopWords: Set<string>
): ExtractedVocabulary => {
  const terms = new Map<string, CountSummary>();
  const phrases = new Map<string, CountSummary>();

  for (const event of events) {
    if (!usableEvent(event)) {
      continue;
    }

    const rawTokens = toCandidateTokens(event.normalizedText);
    const termTokens = rawTokens.filter((token) => isUsableTermToken(token, stopWords));
    const phraseTokens = buildPhraseCandidates(rawTokens, stopWords);

    for (const token of termTokens) {
      pushCount(terms, token, event);
    }

    for (const phrase of phraseTokens) {
      pushCount(phrases, phrase, event);
    }

    if (rawTokens.length <= 2) {
      const countedTerms = new Set(termTokens.map(normalizeTerm));
      phraseTokens.forEach((phrase) => {
        if (!countedTerms.has(normalizeTerm(phrase))) {
          pushCount(terms, phrase, event);
        }
      });
    }
  }

  return {
    terms,
    phrases
  };
};

export const analyzeVocabulary = (
  input: VocabularyAnalysisInput
): VocabularyAnalysisResult => {
  const stopWords = new Set(input.stopWords.map((word) => normalizeTerm(word)));
  const current = extractVocabulary(input.currentEvents, stopWords);
  const previous = extractVocabulary(input.previousEvents, stopWords);

  const currentEntries = toSortedEntries(current.terms);
  const previousMap = previous.terms;
  const currentTotal = currentEntries.reduce(
    (sum, [, value]) => sum + value.count,
    0
  );

  const topTerms = currentEntries
    .slice(0, MAX_INSIGHTS)
    .map(([term, value]) => {
      const previousCount = previousMap.get(term)?.count ?? 0;

      return toInsight(
        "top",
        term,
        value.count,
        currentTotal,
        value.count - previousCount,
        value.firstSeenAt,
        value.lastSeenAt,
        [...value.sourceEventIds]
      );
    });

  const newTerms = currentEntries
    .filter(([term]) => !previousMap.has(term))
    .slice(0, MAX_INSIGHTS)
    .map(([term, value]) =>
      toInsight(
        "new",
        term,
        value.count,
        currentTotal,
        value.count,
        value.firstSeenAt,
        value.lastSeenAt,
        [...value.sourceEventIds]
      )
    );

  const risingTerms = currentEntries
    .map(([term, value]) => ({
      term,
      value,
      delta: value.count - (previousMap.get(term)?.count ?? 0)
    }))
    .filter((item) => item.delta > 0)
    .sort((left, right) => {
      const deltaDiff = right.delta - left.delta;
      if (deltaDiff !== 0) {
        return deltaDiff;
      }

      return left.term.localeCompare(right.term, "zh-Hans-CN");
    })
    .slice(0, MAX_INSIGHTS)
    .map((item) =>
      toInsight(
        "rising",
        item.term,
        item.value.count,
        currentTotal,
        item.delta,
        item.value.firstSeenAt,
        item.value.lastSeenAt,
        [...item.value.sourceEventIds]
      )
    );

  const fallingTerms = [...previousMap.entries()]
    .map(([term, value]) => {
      const currentValue = current.terms.get(term);
      const currentCount = currentValue?.count ?? 0;

      return {
        term,
        previousValue: value,
        currentValue,
        currentCount,
        delta: currentCount - value.count
      };
    })
    .filter((item) => item.delta < 0)
    .sort((left, right) => {
      const deltaDiff = left.delta - right.delta;
      if (deltaDiff !== 0) {
        return deltaDiff;
      }

      return left.term.localeCompare(right.term, "zh-Hans-CN");
    })
    .slice(0, MAX_INSIGHTS)
    .map((item) => {
      const source = item.currentValue ?? item.previousValue;

      return toInsight(
        "falling",
        item.term,
        item.currentCount,
        currentTotal,
        item.delta,
        source.firstSeenAt,
        source.lastSeenAt,
        [...source.sourceEventIds]
      );
    });

  const previousPhraseMap = previous.phrases;
  const phraseTotal = [...current.phrases.values()].reduce(
    (sum, value) => sum + value.count,
    0
  );

  const phraseTerms = toSortedEntries(current.phrases)
    .slice(0, MAX_INSIGHTS)
    .map(([term, value]) => {
      const previousCount = previousPhraseMap.get(term)?.count ?? 0;

      return toInsight(
        "phrase",
        term,
        value.count,
        phraseTotal,
        value.count - previousCount,
        value.firstSeenAt,
        value.lastSeenAt,
        [...value.sourceEventIds]
      );
    });

  return {
    topTerms,
    newTerms,
    risingTerms,
    fallingTerms,
    phraseTerms
  };
};
