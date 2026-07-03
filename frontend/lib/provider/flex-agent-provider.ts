import {
  FlexAgentChatLanguageModel,
  type FlexAgentModelConfig,
} from '@/lib/provider/flex-agent-chat-model';

export interface FlexAgentProviderSettings {
  baseURL?: string;
  wsURL?: string;
  enablePlanning?: boolean;
}

export interface FlexAgentProvider {
  (modelId: string): FlexAgentChatLanguageModel;
  languageModel(modelId: string): FlexAgentChatLanguageModel;
}

export function createFlexAgent(settings: FlexAgentProviderSettings = {}): FlexAgentProvider {
  const baseURL = settings.baseURL?.replace(/\/+$/, '') ?? 'http://localhost:8000';
  const wsURL = settings.wsURL?.replace(/\/+$/, '') ?? 'ws://localhost:8000';

  const config: FlexAgentModelConfig = {
    provider: 'flex-agent',
    baseURL,
    wsURL,
    enablePlanning: settings.enablePlanning ?? process.env.NEXT_PUBLIC_ENABLE_PLANNING === 'true',
  };

  const createModel = (modelId: string) => new FlexAgentChatLanguageModel(modelId, config);

  const provider = ((modelId: string) => createModel(modelId)) as FlexAgentProvider;
  provider.languageModel = createModel;

  return provider;
}

export const flexAgent = createFlexAgent();
