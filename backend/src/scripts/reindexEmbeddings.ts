import { prisma } from '../lib/prisma';
import { reindexAllProducts } from '../services/searchIndexing.service';

const run = async () => {
  try {
    await reindexAllProducts();
    console.log('Reindex embeddings thành công.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    console.error('Reindex embeddings thất bại:', message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void run();
