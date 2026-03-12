-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "compareAtPrice" INTEGER,
ADD COLUMN     "presetsCount" INTEGER NOT NULL DEFAULT 1;
