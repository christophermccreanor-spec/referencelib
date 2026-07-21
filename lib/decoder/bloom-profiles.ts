import { BloomStage } from "@/lib/types";

// Matches the six-row table from the discovery conversation.
export const BLOOM_PROFILES: Record<BloomStage, { label: string; demonstration: string }> = {
  remember: { label: "Remember", demonstration: "Recall knowledge." },
  understand: { label: "Understand", demonstration: "Explain meaning." },
  apply: { label: "Apply", demonstration: "Use knowledge in a situation." },
  analyse: { label: "Analyse", demonstration: "Examine components and relationships." },
  evaluate: { label: "Evaluate", demonstration: "Make a justified judgement using criteria." },
  create: { label: "Create", demonstration: "Develop or propose something new." },
};

const STAGE_ORDER: BloomStage[] = ["remember", "understand", "apply", "analyse", "evaluate", "create"];

export function orderBloomStages(stages: BloomStage[]): BloomStage[] {
  const unique = Array.from(new Set(stages));
  return unique.sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
}
