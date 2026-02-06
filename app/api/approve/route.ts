import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const type = body.type === "task" ? "task" : "appointment";
    const id = String(body.id || "");
    const status = body.status === "declined" ? "declined" : "approved";

    if (!id) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (type === "appointment") {
      const appointment = await prisma.appointment.findUnique({ where: { id } });
      if (!appointment || appointment.memberId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          status,
          approvedById: user.id,
          approvedAt: new Date()
        }
      });
      return NextResponse.json({ appointment: updated });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.assignedToId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.task.update({
      where: { id },
      data: {
        status,
        approvedById: user.id,
        approvedAt: new Date()
      }
    });
    return NextResponse.json({ task: updated });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
