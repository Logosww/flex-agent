import { getConfig } from '@/config';
import { ChromaClient, type Collection, type EmbeddingFunction } from 'chromadb';
import { embedText } from '@/services/llm';

class FlexAgentEmbeddingFunction implements EmbeddingFunction {
  name = 'flex-agent-embed';

  async generate(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => embedText(text)));
  }

  defaultSpace() {
    return 'cosine' as const;
  }

  getConfig() {
    return {};
  }

  static buildFromConfig(): FlexAgentEmbeddingFunction {
    return new FlexAgentEmbeddingFunction();
  }
}

const embeddingFunction = new FlexAgentEmbeddingFunction();

let collectionPromise: Promise<Collection | null> | null = null;
let chromaUnavailableLogged = false;

async function getCollection(): Promise<Collection | null> {
  if (!collectionPromise) {
    collectionPromise = initCollection();
  }
  return collectionPromise;
}

async function initCollection(): Promise<Collection | null> {
  const { chromaEnabled, chromaHost, chromaPort } = getConfig();
  if (!chromaEnabled) {
    return null;
  }

  try {
    const client = new ChromaClient({
      host: chromaHost,
      port: chromaPort,
    });
    return await client.getOrCreateCollection({
      name: 'agent-traces',
      embeddingFunction,
    });
  } catch {
    if (!chromaUnavailableLogged) {
      chromaUnavailableLogged = true;
      console.warn(
        `[embedding] Chroma unavailable at ${chromaHost}:${chromaPort}, long-term memory disabled`,
      );
    }
    return null;
  }
}

export async function upsertSuccessfulTrace(id: string, document: string): Promise<void> {
  const collection = await getCollection();
  if (!collection) return;

  try {
    const embedding = await embedText(document);
    await collection.add({
      ids: [id],
      embeddings: [embedding],
      documents: [document],
    });
  } catch {
    if (!chromaUnavailableLogged) {
      chromaUnavailableLogged = true;
      console.warn('[embedding] Chroma write failed, long-term memory disabled');
    }
  }
}

export async function querySimilarTraces(userGoal: string, k: number): Promise<string> {
  const collection = await getCollection();
  if (!collection) return '';

  try {
    const q = await embedText(userGoal);
    const res = await collection.query({
      queryEmbeddings: [q],
      nResults: k,
    });
    const docs = res.documents?.[0] ?? [];
    return docs.filter(Boolean).join('\n---\n');
  } catch {
    if (!chromaUnavailableLogged) {
      chromaUnavailableLogged = true;
      console.warn('[embedding] Chroma query failed, long-term memory disabled');
    }
    return '';
  }
}
