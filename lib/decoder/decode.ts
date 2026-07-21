import { findCommandVerbs } from "@/lib/decoder/command-verbs";
import { orderBloomStages } from "@/lib/decoder/bloom-profiles";
import { extractComponents } from "@/lib/decoder/concept-extraction";
import { QUALIFICATION_PROFILES } from "@/lib/decoder/qualification-profiles";
import { DecodedQuestion, QualificationProfileId } from "@/lib/types";

export function decodeQuestion(
  question: string,
  qualificationProfileId: QualificationProfileId
): DecodedQuestion {
  const trimmed = question.trim();
  const commandVerbs = findCommandVerbs(trimmed);
  const bloomSequence = orderBloomStages(commandVerbs.flatMap((v) => v.bloomStages));
  const components = extractComponents(trimmed);
  const profile = QUALIFICATION_PROFILES[qualificationProfileId] ?? QUALIFICATION_PROFILES.custom;

  const searchTerms = Array.from(
    new Set(components.flatMap((c) => c.searchTerms).filter((t) => t.length > 2))
  );

  return {
    question: trimmed,
    qualificationProfileId,
    commandVerbs,
    bloomSequence,
    components,
    qualificationExpectation: profile.expectation,
    searchTerms,
  };
}
