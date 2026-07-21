import { CommandVerbMatch } from "@/lib/types";

// Blueprint section 7 and the discovery-session table: verbs with a stable
// cognitive mapping get high confidence. Verbs that vary by institution
// (discuss, explore, consider, assess) are flagged institution-dependent
// rather than silently assigned a single Bloom stage.
interface VerbDefinition {
  verb: string;
  bloomStages: CommandVerbMatch["bloomStages"];
  confidence: CommandVerbMatch["confidence"];
  note: string;
}

const VERB_TABLE: VerbDefinition[] = [
  { verb: "identify", bloomStages: ["remember"], confidence: "high", note: "Recall knowledge." },
  { verb: "describe", bloomStages: ["understand"], confidence: "high", note: "Explain meaning." },
  { verb: "explain", bloomStages: ["understand", "analyse"], confidence: "high", note: "Explain meaning, often with some analysis of relationships." },
  { verb: "apply", bloomStages: ["apply"], confidence: "high", note: "Use knowledge in a situation." },
  { verb: "compare", bloomStages: ["analyse"], confidence: "high", note: "Examine components and relationships." },
  { verb: "contrast", bloomStages: ["analyse"], confidence: "high", note: "Examine differences between components." },
  { verb: "analyse", bloomStages: ["analyse"], confidence: "high", note: "Examine components and relationships." },
  { verb: "examine", bloomStages: ["analyse"], confidence: "high", note: "Examine components and relationships." },
  { verb: "assess", bloomStages: ["analyse", "evaluate"], confidence: "institution-dependent", note: "Varies: some institutions treat this as analysis, others expect a justified judgement." },
  { verb: "evaluate", bloomStages: ["evaluate"], confidence: "high", note: "Make a justified judgement using criteria." },
  { verb: "critically evaluate", bloomStages: ["analyse", "evaluate"], confidence: "high", note: "Analyse and evaluate with explicit judgement." },
  { verb: "critique", bloomStages: ["analyse", "evaluate"], confidence: "high", note: "Analyse and evaluate with explicit judgement." },
  { verb: "discuss", bloomStages: ["understand", "analyse"], confidence: "institution-dependent", note: "Varies widely: confirm against your institution's own definition." },
  { verb: "explore", bloomStages: ["understand"], confidence: "institution-dependent", note: "Varies widely: confirm against your institution's own definition." },
  { verb: "consider", bloomStages: ["understand", "analyse"], confidence: "institution-dependent", note: "Varies widely: confirm against your institution's own definition." },
  { verb: "recommend", bloomStages: ["evaluate", "create"], confidence: "high", note: "Select and justify appropriate actions." },
  { verb: "propose", bloomStages: ["create"], confidence: "high", note: "Develop or propose something new." },
  { verb: "design", bloomStages: ["create"], confidence: "high", note: "Develop or propose something new." },
  { verb: "develop", bloomStages: ["create"], confidence: "high", note: "Develop or propose something new." },
  { verb: "justify", bloomStages: ["evaluate"], confidence: "high", note: "Make a justified judgement using criteria." },
  { verb: "outline", bloomStages: ["remember", "understand"], confidence: "high", note: "Recall and briefly explain." },
  { verb: "define", bloomStages: ["remember"], confidence: "high", note: "Recall knowledge." },
];

// Sorted longest-phrase-first so "critically evaluate" matches before "evaluate".
const SORTED_VERBS = [...VERB_TABLE].sort((a, b) => b.verb.length - a.verb.length);

export function findCommandVerbs(question: string): CommandVerbMatch[] {
  const lower = question.toLowerCase();
  const matches: CommandVerbMatch[] = [];
  const claimed = new Set<number>();

  for (const def of SORTED_VERBS) {
    let searchFrom = 0;
    while (true) {
      const index = lower.indexOf(def.verb, searchFrom);
      if (index === -1) break;
      const alreadyClaimed = [...claimed].some(
        (c) => index < c + 30 && index + def.verb.length > c - 30
      );
      searchFrom = index + def.verb.length;
      if (alreadyClaimed) continue;
      claimed.add(index);
      matches.push({
        verb: def.verb,
        bloomStages: def.bloomStages,
        confidence: def.confidence,
        note: def.note,
      });
    }
  }

  return matches;
}
