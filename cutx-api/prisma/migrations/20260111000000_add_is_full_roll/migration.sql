-- Add isFullRoll column to Panel table
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "isFullRoll" BOOLEAN NOT NULL DEFAULT false;
