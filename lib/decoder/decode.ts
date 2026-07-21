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

  // One representative term per concept, not every synonym variant: the
  // route layer only sends the first four searchTerms to OpenAlex, so
  // flattening every component's full searchTerms array here risked that
  // window filling up with two or three synonym spellings of the same
  // concept and crowding out the question's other concepts entirely.
  const searchTerms = Array.from(
    new Set(
      components
        .filter((c) => c.type === "concept")
        .map((c) => c.searchTerms[0])
        .filter((t): t is string => Boolean(t) && t.length > 2)
    )
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
