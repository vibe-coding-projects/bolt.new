import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';
import { getAPIKey } from '~/lib/.server/llm/api-key';
import { getAnthropicModel } from '~/lib/.server/llm/model';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

export function streamText(messages: Messages, env: Env, options?: StreamingOptions) {
  return _streamText({
    model: getAnthropicModel(getAPIKey(env)),
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    headers: {
      'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
    },
    messages: convertToCoreMessages(messages),
    ...options,
  });
}
