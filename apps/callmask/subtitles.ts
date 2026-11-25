// Reels-style subtitle groups for the call-masking explainer: a few words at a time, cut where the speech pauses.

/**
 * Groups a line's words into short pieces (word indexes): a piece ends after punctuation, at `maxWords`, or before it
 * would pass `maxChars`.
 */
export function wordGroups(words: string[], maxWords = 3, maxChars = 18): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  let chars = 0;
  words.forEach((word, i) => {
    if (current.length > 0 && (current.length >= maxWords || chars + 1 + word.length > maxChars)) {
      groups.push(current);
      current = [];
      chars = 0;
    }
    current.push(i);
    chars += (current.length > 1 ? 1 : 0) + word.length;
    if (/[.,?!]$/.test(word)) {
      groups.push(current);
      current = [];
      chars = 0;
    }
  });
  if (current.length > 0) groups.push(current);
  return groups;
}
