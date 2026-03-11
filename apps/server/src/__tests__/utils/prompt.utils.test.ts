import { describe, it, expect } from 'vitest';
import {
  generateRelevanceCheckMessages,
  generateWrapUpMessages,
  generateAgentResponseMessages,
} from '../../utils/prompt.utils';

describe('generateRelevanceCheckMessages', () => {
  it('should return system and user messages', () => {
    const messages = generateRelevanceCheckMessages('business strategy', 'What about ROI?', 'context here');

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('should include agent specialty in user message', () => {
    const messages = generateRelevanceCheckMessages('cybersecurity', 'topic', 'context');

    expect(messages[1].content).toContain('cybersecurity');
  });

  it('should include latest message in user message', () => {
    const messages = generateRelevanceCheckMessages('spec', 'What is the market size?', 'ctx');

    expect(messages[1].content).toContain('What is the market size?');
  });

  it('should include pool context in user message', () => {
    const messages = generateRelevanceCheckMessages('spec', 'msg', 'previous discussion context');

    expect(messages[1].content).toContain('previous discussion context');
  });

  it('system message should mention yes/no response format', () => {
    const messages = generateRelevanceCheckMessages('spec', 'msg', 'ctx');

    expect(messages[0].content.toLowerCase()).toContain('yes');
    expect(messages[0].content.toLowerCase()).toContain('no');
  });
});

describe('generateWrapUpMessages', () => {
  it('should return system and user messages', () => {
    const messages = generateWrapUpMessages('transcript text');

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('should include transcript as user content', () => {
    const transcript = '[Business]: Good point\n[Engineering]: I agree';
    const messages = generateWrapUpMessages(transcript);

    expect(messages[1].content).toBe(transcript);
  });

  it('system message should request Vietnamese summary', () => {
    const messages = generateWrapUpMessages('text');

    expect(messages[0].content.toLowerCase()).toContain('vietnamese');
  });
});

describe('generateAgentResponseMessages', () => {
  const agent = {
    name: 'Business Expert',
    specialty: 'market analysis',
    systemPrompt: 'You are a business analyst.',
  };

  it('should use agent systemPrompt when available', () => {
    const messages = generateAgentResponseMessages(agent, []);

    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe('You are a business analyst.');
  });

  it('should generate default system prompt when systemPrompt is empty', () => {
    const agentNoPrompt = { name: 'Test', specialty: 'testing', systemPrompt: '' };
    const messages = generateAgentResponseMessages(agentNoPrompt, []);

    expect(messages[0].content).toContain('Test');
    expect(messages[0].content).toContain('testing');
  });

  it('should include conversation history', () => {
    const history = [
      { agentId: 'user', content: 'What about scaling?' },
      { agentId: 'engineering', content: 'We need microservices.' },
    ];

    const messages = generateAgentResponseMessages(agent, history);

    // system + history messages + final user prompt
    expect(messages.length).toBe(4);
    expect(messages[1].content).toContain('What about scaling?');
    expect(messages[2].content).toContain('microservices');
  });

  it('should include agent name in final prompt', () => {
    const messages = generateAgentResponseMessages(agent, []);

    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.content).toContain('Business Expert');
  });

  it('should handle empty history', () => {
    const messages = generateAgentResponseMessages(agent, []);

    // system + final user prompt only
    expect(messages).toHaveLength(2);
  });
});
