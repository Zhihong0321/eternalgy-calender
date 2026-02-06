import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const assignedToId = Number(body.assignedToId);

    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    const deadlineAt = body.deadlineAt ? new Date(body.deadlineAt) : null;

    if (!title || Number.isNaN(assignedToId)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (startAt && endAt && startAt >= endAt) {
      return NextResponse.json({ error: "Start must be before end" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        content: content || null,
        startAt: startAt && !Number.isNaN(startAt.getTime()) ? startAt : null,
        endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : null,
        deadlineAt: deadlineAt && !Number.isNaN(deadlineAt.getTime()) ? deadlineAt : null,
        createdById: user.id,
        assignedToId
      }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
