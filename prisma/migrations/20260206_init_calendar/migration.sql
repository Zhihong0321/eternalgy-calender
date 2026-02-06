-- Create enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalStatus') THEN
    CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'declined');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "calendar_departments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "calendar_departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "calendar_member_departments" (
  "id" TEXT NOT NULL,
  "memberId" INTEGER NOT NULL,
  "departmentId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_member_departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "calendar_appointments" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "content" TEXT,
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
  "createdById" INTEGER NOT NULL,
  "memberId" INTEGER NOT NULL,
  "approvedById" INTEGER,
  "approvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "calendar_appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "calendar_tasks" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "startAt" TIMESTAMPTZ,
  "endAt" TIMESTAMPTZ,
  "deadlineAt" TIMESTAMPTZ,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
  "createdById" INTEGER NOT NULL,
  "assignedToId" INTEGER NOT NULL,
  "approvedById" INTEGER,
  "approvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "calendar_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_member_departments_memberId_departmentId_key"
ON "calendar_member_departments"("memberId", "departmentId");

CREATE INDEX IF NOT EXISTS "calendar_member_departments_memberId_idx"
ON "calendar_member_departments"("memberId");

CREATE INDEX IF NOT EXISTS "calendar_appointments_memberId_startAt_idx"
ON "calendar_appointments"("memberId", "startAt");

CREATE INDEX IF NOT EXISTS "calendar_appointments_createdById_idx"
ON "calendar_appointments"("createdById");

CREATE INDEX IF NOT EXISTS "calendar_tasks_assignedToId_deadlineAt_idx"
ON "calendar_tasks"("assignedToId", "deadlineAt");

CREATE INDEX IF NOT EXISTS "calendar_tasks_createdById_idx"
ON "calendar_tasks"("createdById");

-- Foreign key to calendar_departments only (no FK to existing user table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendar_member_departments_departmentId_fkey'
  ) THEN
    ALTER TABLE "calendar_member_departments"
      ADD CONSTRAINT "calendar_member_departments_departmentId_fkey"
      FOREIGN KEY ("departmentId") REFERENCES "calendar_departments"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;
