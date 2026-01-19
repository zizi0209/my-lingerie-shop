-- CreateTable
CREATE TABLE "ProductOnPost" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "position" INTEGER,
    "displayType" TEXT NOT NULL DEFAULT 'inline-card',
    "customNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOnPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOnPost_postId_idx" ON "ProductOnPost"("postId");

-- CreateIndex
CREATE INDEX "ProductOnPost_productId_idx" ON "ProductOnPost"("productId");

-- CreateIndex
CREATE INDEX "ProductOnPost_displayType_idx" ON "ProductOnPost"("displayType");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOnPost_postId_productId_key" ON "ProductOnPost"("postId", "productId");

-- AddForeignKey
ALTER TABLE "ProductOnPost" ADD CONSTRAINT "ProductOnPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOnPost" ADD CONSTRAINT "ProductOnPost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
