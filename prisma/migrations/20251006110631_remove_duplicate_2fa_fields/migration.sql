/*
  Warnings:

  - You are about to drop the column `twoFactorBackupCodes` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "twoFactorBackupCodes",
DROP COLUMN "twoFactorSecret";
