import type { ChatMessage, Agent } from '@mindpool/shared';

export function generateRelevanceCheckMessages(agentSpecialty: string, latestMessage: string, poolContext: string): ChatMessage[] {
    return [
        {
            role: 'system',
            content:
                'You are a relevance checker. Given an agent specialty and the latest discussion message, respond with only "yes" or "no" — should this agent contribute?',
        },
        {
            role: 'user',
            content: `Agent specialty: ${agentSpecialty}\nLatest message: ${latestMessage}\nContext: ${poolContext}\n\nShould this agent raise hand?`,
        },
    ];
}

export function generateWrapUpMessages(transcript: string): ChatMessage[] {
    return [
        {
            role: 'system',
            content:
                'Summarize this meeting discussion in Vietnamese. Be concise. Highlight key insights and action items.',
        },
        { role: 'user', content: transcript },
    ];
}

export function generateAgentResponseMessages(
    agent: Pick<Agent, 'name' | 'specialty' | 'systemPrompt'>,
    historyMessages: { agentId: string; content: string }[]
): ChatMessage[] {
    const history = historyMessages.map((m) => ({
        role: 'user' as const,
        content: `[${m.agentId}]: ${m.content}`,
    }));

    return [
        {
            role: 'system',
            content:
                agent.systemPrompt ||
                `You are ${agent.name}, an expert in ${agent.specialty}. Respond in Vietnamese. Be concise and insightful.`,
        },
        ...history,
        {
            role: 'user',
            content: `Based on the discussion, share your perspective as ${agent.name}.`,
        },
    ];
}
