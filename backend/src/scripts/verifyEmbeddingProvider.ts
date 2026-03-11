import dotenv from 'dotenv';
import { embedTextsDetailed, getEmbeddingHealth } from '../services/embeddingClient';

dotenv.config();

const run = async () => {
  const health = await getEmbeddingHealth();
  const sample = await embedTextsDetailed(['health-check']);

  const report = {
    health,
    sample: {
      status: sample.status,
      provider: sample.provider,
      model: sample.model,
      reason: sample.reason,
      embeddingCount: sample.embeddings.length,
      dimension: sample.embeddings[0]?.length ?? 0,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  if (health.status !== 'ok' || sample.status !== 'ok') {
    process.exitCode = 1;
  }
};

void run();
