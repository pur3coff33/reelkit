// A documentary's research, kept as data: the sources, the facts taken from them, and the claims the film makes (voice
// lines, dates, map labels, titles), each naming the facts it states. An app's test calls checkFacts, so nothing reaches
// the screen or the narration without a source behind it. The saf44 pattern (apps/saf44/facts.ts), made general.

export type Source = { title: string; url: string; accessed: string };
/** `where`: the section, page or paragraph of the source. `note`: where sources disagree, and which value the film uses. */
export type Fact = { value: string; sources: string[]; where: string; note?: string };
/** Something the film says or shows. */
export type Claim = { id: string; text: string; facts: string[] };

/** Every problem, one line each; an empty list means every claim is backed. */
export function checkFacts(claims: Claim[], facts: Record<string, Fact>, sources: Record<string, Source>): string[] {
  const problems: string[] = [];
  for (const c of claims) {
    if (!c.facts.length) problems.push(`claim ${c.id} ("${c.text}") names no facts`);
    for (const id of c.facts) if (!(id in facts)) problems.push(`claim ${c.id} names fact ${id}, which isn't in the facts`);
  }
  for (const [id, f] of Object.entries(facts)) {
    if (!f.sources.length) problems.push(`fact ${id} has no sources`);
    for (const s of f.sources) if (!(s in sources)) problems.push(`fact ${id} cites source ${s}, which isn't in the sources`);
  }
  return problems;
}
