import { prisma } from '../lib/prisma';
import { reconcileSearchIndex } from '../services/searchReconcile.service';

const run = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchArgIndex = args.findIndex((arg) => arg === '--batch');
  const batchSize = batchArgIndex >= 0
    ? Number(args[batchArgIndex + 1])
    : undefined;
  const safeBatchSize = Number.isFinite(batchSize) && batchSize ? batchSize : 200;

  try {
    const report = await reconcileSearchIndex(safeBatchSize, { dryRun });
    console.log(JSON.stringify({ success: true, report }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    console.error('Reconcile search index thất bại:', message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void run();
