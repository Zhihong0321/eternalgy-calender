import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: Request) {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const memberIdParam = searchParams.get("memberId");
    const dateParam = searchParams.get("date");
    const view = searchParams.get("view") ?? "day";

    if (!memberIdParam || !dateParam) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const memberId = Number(memberIdParam);
    if (Number.isNaN(memberId)) {
      return NextResponse.json({ error: "Invalid member" }, { status: 400 });
    }

    const date = new Date(`${dateParam}T00:00:00`);

    if (view === "month") {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const [appointments, tasks] = await Promise.all([
        prisma.appointment.findMany({
          where: {
            memberId,
            status: "approved",
            startAt: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          select: { id: true, startAt: true }
        }),
        prisma.task.findMany({
          where: {
            assignedToId: memberId,
            status: "approved",
            OR: [
              {
                startAt: {
                  gte: monthStart,
                  lte: monthEnd
                }
              },
              {
                deadlineAt: {
                  gte: monthStart,
                  lte: monthEnd
                }
              }
            ]
          },
          select: { id: true, startAt: true, deadlineAt: true }
        })
      ]);

      const summary: Record<string, { appointments: number; tasks: number }> = {};

      for (const appt of appointments) {
        const key = appt.startAt.toISOString().slice(0, 10);
        summary[key] = summary[key] ?? { appointments: 0, tasks: 0 };
        summary[key].appointments += 1;
      }

      for (const task of tasks) {
        const dateValue = task.startAt ?? task.deadlineAt;
        if (!dateValue) continue;
        const key = dateValue.toISOString().slice(0, 10);
        summary[key] = summary[key] ?? { appointments: 0, tasks: 0 };
        summary[key].tasks += 1;
      }

      return NextResponse.json({ summary });
    }

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [appointments, tasks, pendingAppointments, pendingTasks] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          memberId,
          status: "approved",
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart }
        },
        orderBy: { startAt: "asc" }
      }),
      prisma.task.findMany({
        where: {
          assignedToId: memberId,
          status: "approved",
          OR: [
            {
              startAt: { gte: dayStart, lte: dayEnd }
            },
            {
              deadlineAt: { gte: dayStart, lte: dayEnd }
            }
          ]
        },
        orderBy: { deadlineAt: "asc" }
      }),
      prisma.appointment.findMany({
        where: {
          memberId,
          status: "pending",
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart }
        },
        orderBy: { startAt: "asc" }
      }),
      prisma.task.findMany({
        where: {
          assignedToId: memberId,
          status: "pending",
          OR: [
            {
              startAt: { gte: dayStart, lte: dayEnd }
            },
            {
              deadlineAt: { gte: dayStart, lte: dayEnd }
            }
          ]
        },
        orderBy: { deadlineAt: "asc" }
      })
    ]);

    return NextResponse.json({
      day: {
        appointments,
        tasks,
        pendingAppointments,
        pendingTasks
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
