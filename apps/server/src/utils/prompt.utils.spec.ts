import { describe, it, expect } from 'vitest';
import {
    generateRelevanceCheckMessages,
    generateWrapUpMessages,
    generateAgentResponseMessages,
} from './prompt.utils';

describe('Prompt Utilities', () => {
    describe('generateRelevanceCheckMessages', () => {
        it('should generate system and user messages containing context', () => {
            const messages = generateRelevanceCheckMessages('Backend', 'What about db?', 'Scaling system');
            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe('system');
            expect(messages[1].role).toBe('user');
            expect(messages[1].content).toContain('Backend');
            expect(messages[1].content).toContain('What about db?');
            expect(messages[1].content).toContain('Scaling system');
        });
    });

    describe('generateWrapUpMessages', () => {
        it('should generate transcript summarization messages', () => {
            const msgs = generateWrapUpMessages('Transcript text');
            expect(msgs).toHaveLength(2);
            expect(msgs[1].content).toBe('Transcript text');
        });
    });

    describe('generateAgentResponseMessages', () => {
        it('should use default system prompt when empty', () => {
            const agent = { name: 'Bob', specialty: 'UX', systemPrompt: '' };
            const msgs = generateAgentResponseMessages(agent, [{ agentId: 'id1', content: 'hello' }]);
            expect(msgs[0].content).toContain('You are Bob, an expert in UX');
            expect(msgs[1].content).toBe('[id1]: hello');
            expect(msgs[2].content).toContain('perspective as Bob');
        });

        it('should use custom system prompt when provided', () => {
            const agent = { name: 'Alice', specialty: 'AI', systemPrompt: 'Custom prompt!' };
            const msgs = generateAgentResponseMessages(agent, []);
            expect(msgs[0].content).toBe('Custom prompt!');
        });
    });
});
