export interface Config {
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  embeddingModel: string;
  chromaEnabled: boolean;
  chromaHost: string;
  chromaPort: number;
  host: string;
  port: number;
  corsOrigins: string[];
}

let _config: Config | null = null;

export function getConfig(): Config {
  if (_config) return _config;

  _config = {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    openaiBaseUrl:
      process.env.OPENAI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai',
    openaiModel: process.env.OPENAI_MODEL ?? 'gemini-2.5-flash',
    embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-v3',
    chromaEnabled: process.env.CHROMA_ENABLED !== 'false',
    chromaHost: process.env.CHROMA_HOST ?? 'localhost',
    chromaPort: Number(process.env.CHROMA_PORT) || 8000,
    host: process.env.HOST ?? '0.0.0.0',
    port: Number(process.env.PORT) || 8000,
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:8000').split(
      ',',
    ),
  };

  return _config;
}
