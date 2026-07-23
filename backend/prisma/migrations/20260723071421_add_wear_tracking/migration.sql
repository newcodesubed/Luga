-- AlterTable
ALTER TABLE "clothing_items" ADD COLUMN     "last_worn_at" TIMESTAMP(3),
ADD COLUMN     "wear_count" INTEGER NOT NULL DEFAULT 0;
