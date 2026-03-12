-- CreateIndex
CREATE INDEX "Section_isPublished_category_idx" ON "Section"("isPublished", "category");

-- CreateIndex
CREATE INDEX "Section_isPublished_isFeatured_sortOrder_idx" ON "Section"("isPublished", "isFeatured", "sortOrder");

-- CreateIndex
CREATE INDEX "Section_isPublished_createdAt_idx" ON "Section"("isPublished", "createdAt");
