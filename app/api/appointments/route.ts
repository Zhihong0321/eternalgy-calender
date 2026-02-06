import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const subject = String(body.subject || "").trim();
    const content = String(body.content || "").trim();
    const memberId = Number(body.memberId);
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);

    if (!subject || Number.isNaN(memberId) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (startAt >= endAt) {
      return NextResponse.json({ error: "Start must be before end" }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        subject,
        content: content || null,
        startAt,
        endAt,
        createdById: user.id,
        memberId
      }
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
