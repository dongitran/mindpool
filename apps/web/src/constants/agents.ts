export interface AgentDefinition {
  id: string;
  name: string;
  icon: string;
  specialty: string;
  role: string;
  signatureQuestion: string;
  personality: {
    directness: number;
    creativity: number;
    skepticism: number;
  };
}

export const BUILT_IN_AGENTS: AgentDefinition[] = [
  { id: 'mindx', name: 'MindX', icon: '\u{1F9E0}', specialty: '\u0110i\u1EC1u ph\u1ED1i, kh\u00F4ng c\u00F3 domain', role: 'Orchestrator', signatureQuestion: '', personality: { directness: 0.5, creativity: 0.5, skepticism: 0.3 } },
  { id: 'business-strategist', name: 'Business Strategist', icon: '\u{1F4BC}', specialty: 'ROI, market, competition', role: 'Strategist', signatureQuestion: 'Ai tr\u1EA3 ti\u1EC1n v\u00E0 t\u1EA1i sao?', personality: { directness: 0.8, creativity: 0.6, skepticism: 0.5 } },
  { id: 'software-engineer', name: 'Software Engineer', icon: '\u{1F468}\u200D\u{1F4BB}', specialty: 'Tech stack, feasibility, scale', role: 'Engineer', signatureQuestion: 'Build \u0111\u01B0\u1EE3c kh\u00F4ng? Cost bao nhi\u00EAu?', personality: { directness: 0.9, creativity: 0.5, skepticism: 0.7 } },
  { id: 'ux-designer', name: 'UX Designer', icon: '\u{1F3A8}', specialty: 'User behavior, friction, flow', role: 'Designer', signatureQuestion: 'User th\u1EF1c s\u1EF1 c\u1EA3m th\u1EA5y g\u00EC?', personality: { directness: 0.6, creativity: 0.9, skepticism: 0.4 } },
  { id: 'security-expert', name: 'Security Expert', icon: '\u{1F512}', specialty: 'Vulnerabilities, compliance', role: 'Expert', signatureQuestion: '\u0110i\u1EC3m y\u1EBFu n\u1EB1m \u1EDF \u0111\u00E2u?', personality: { directness: 0.9, creativity: 0.3, skepticism: 0.9 } },
  { id: 'data-scientist', name: 'Data Scientist', icon: '\u{1F4CA}', specialty: 'Metrics, evidence, patterns', role: 'Analyst', signatureQuestion: 'S\u1ED1 li\u1EC7u n\u00F3i g\u00EC?', personality: { directness: 0.7, creativity: 0.5, skepticism: 0.8 } },
  { id: 'legal-advisor', name: 'Legal Advisor', icon: '\u2696\uFE0F', specialty: 'Risk, compliance, contracts', role: 'Advisor', signatureQuestion: '\u0110i\u1EC1u g\u00EC c\u00F3 th\u1EC3 ki\u1EC7n \u0111\u01B0\u1EE3c?', personality: { directness: 0.8, creativity: 0.2, skepticism: 0.9 } },
  { id: 'creative-director', name: 'Creative Director', icon: '\u2728', specialty: 'Narrative, differentiation', role: 'Director', signatureQuestion: '\u0110i\u1EC1u g\u00EC s\u1EBD \u0111\u01B0\u1EE3c nh\u1EDB m\u00E3i?', personality: { directness: 0.5, creativity: 1.0, skepticism: 0.3 } },
  { id: 'ethicist', name: 'Ethicist', icon: '\u{1F30D}', specialty: 'Second-order effects, fairness', role: 'Advisor', signatureQuestion: 'Ai b\u1ECB \u1EA3nh h\u01B0\u1EDFng kh\u00F4ng t\u1ED1t?', personality: { directness: 0.6, creativity: 0.7, skepticism: 0.7 } },
  { id: 'market-analyst', name: 'Market Analyst', icon: '\u{1F4C8}', specialty: 'Trends, competitors, TAM', role: 'Analyst', signatureQuestion: 'Th\u1ECB tr\u01B0\u1EDDng \u0111ang \u0111i \u0111\u00E2u?', personality: { directness: 0.7, creativity: 0.5, skepticism: 0.6 } },
  { id: 'devils-advocate', name: "Devil's Advocate", icon: '\u{1F608}', specialty: 'Challenge m\u1ECDi assumption', role: 'Challenger', signatureQuestion: 'T\u1EA1i sao c\u00E1i n\u00E0y s\u1EBD fail?', personality: { directness: 1.0, creativity: 0.6, skepticism: 1.0 } },
];

export function getAgentById(id: string): AgentDefinition | undefined {
  return BUILT_IN_AGENTS.find((a) => a.id === id);
}
