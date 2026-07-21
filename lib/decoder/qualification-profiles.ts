import { QualificationProfile, QualificationProfileId } from "@/lib/types";

// Pilot scope confirmed CIPD-only for the first 10-15 students, so the three
// CIPD levels are fully specified. The remaining profiles are kept so the
// decoder never breaks for a non-CIPD question, but their wording is
// intentionally lighter until the broader pilot phase.
export const QUALIFICATION_PROFILES: Record<QualificationProfileId, QualificationProfile> = {
  "cipd-3": {
    id: "cipd-3",
    label: "CIPD Level 3",
    expectation:
      "Describe and apply core HR and L&D concepts to a workplace situation, using recognised sources to support points.",
    evidenceHierarchy: [
      "CIPD factsheets and professional-body guidance",
      "Recognised HR/L&D textbooks",
      "Organisational examples and case studies",
    ],
  },
  "cipd-5": {
    id: "cipd-5",
    label: "CIPD Level 5",
    expectation:
      "Examine recognised concepts, compare different perspectives, apply knowledge to a workplace context, and reach a supported conclusion.",
    evidenceHierarchy: [
      "Peer-reviewed empirical journal articles",
      "CIPD research reports and factsheets",
      "Government and professional-body research",
      "Credible organisational practice reports",
    ],
  },
  "cipd-7": {
    id: "cipd-7",
    label: "CIPD Level 7",
    expectation:
      "Demonstrate systematic understanding, critical awareness of current knowledge, evaluation of competing theoretical perspectives, methodological awareness, independent judgement, and recognition of uncertainty and limitations.",
    evidenceHierarchy: [
      "Systematic reviews and meta-analyses",
      "Peer-reviewed empirical journal articles",
      "Peer-reviewed conceptual and theoretical articles",
      "Government and intergovernmental research",
      "Professional bodies and established research institutions",
    ],
  },
  undergraduate: {
    id: "undergraduate",
    label: "Undergraduate degree",
    expectation: "Apply established concepts and evidence to a defined question, with a clear structure and supported argument.",
    evidenceHierarchy: ["Peer-reviewed journal articles", "Core textbooks", "Government and institutional reports"],
  },
  "postgraduate-diploma": {
    id: "postgraduate-diploma",
    label: "Postgraduate diploma",
    expectation: "Critically engage with current literature and apply it to a specific context, with awareness of limitations.",
    evidenceHierarchy: ["Peer-reviewed journal articles", "Systematic reviews", "Professional and government research"],
  },
  masters: {
    id: "masters",
    label: "Master's degree",
    expectation: "Demonstrate critical evaluation of competing perspectives, methodological awareness, and independent judgement.",
    evidenceHierarchy: ["Systematic reviews and meta-analyses", "Peer-reviewed empirical studies", "Peer-reviewed theoretical articles"],
  },
  doctoral: {
    id: "doctoral",
    label: "Doctoral study",
    expectation: "Demonstrate original contribution to knowledge, comprehensive critical engagement with the field, and methodological rigour.",
    evidenceHierarchy: ["Systematic reviews and meta-analyses", "Peer-reviewed empirical studies", "Primary research and theoretical scholarship"],
  },
  custom: {
    id: "custom",
    label: "Custom institution",
    expectation: "Defined by the qualification level, command-verb definitions and evidence hierarchy you configure.",
    evidenceHierarchy: ["Configure your own evidence hierarchy"],
  },
};
