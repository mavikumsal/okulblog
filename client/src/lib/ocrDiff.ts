export type OcrDiffKind = "same" | "added" | "removed";

export type OcrDiffToken = {
  kind: OcrDiffKind;
  text: string;
};

function tokenize(value: string): string[] {
  return value.match(/\S+\s*/g) ?? [];
}

/** Word-level LCS diff. The original OCR text remains the source of truth for review. */
export function buildOcrDiff(original: string, edited: string): OcrDiffToken[] {
  const left = tokenize(original);
  const right = tokenize(edited);
  const table = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] = left[i].trim() === right[j].trim() ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const result: OcrDiffToken[] = [];
  const push = (kind: OcrDiffKind, text: string) => {
    if (!text) return;
    const last = result[result.length - 1];
    if (last?.kind === kind) last.text += text;
    else result.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i].trim() === right[j].trim()) {
      push("same", right[j]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push("removed", left[i]);
      i += 1;
    } else {
      push("added", right[j]);
      j += 1;
    }
  }
  while (i < left.length) push("removed", left[i++]);
  while (j < right.length) push("added", right[j++]);
  return result;
}

export function countOcrDiffs(tokens: OcrDiffToken[]) {
  return {
    added: tokens.filter(token => token.kind === "added").length,
    removed: tokens.filter(token => token.kind === "removed").length,
  };
}
