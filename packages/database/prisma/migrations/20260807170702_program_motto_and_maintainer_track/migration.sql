-- AlterEnum
ALTER TYPE "ProgramTrack" ADD VALUE 'MAINTAINER';

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "motto" TEXT;
