import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();

    const users = (await prisma.$queryRaw`
      SELECT id, email, agent_code, slug
      FROM "user"
      ORDER BY COALESCE(agent_code, slug, email, id::text)
    `) as Array<{ id: number; email: string | null; agent_code: string | null; slug: string | null }>;

    const deptLinks = (await prisma.$queryRaw`
      SELECT cmd.member_id as member_id, cd.name as department_name
      FROM calendar_member_departments cmd
      JOIN calendar_departments cd ON cd.id = cmd.department_id
    `) as Array<{ member_id: number; department_name: string }>;

    const departmentsByMember = new Map<number, string[]>();
    for (const link of deptLinks) {
      const existing = departmentsByMember.get(link.member_id) ?? [];
      existing.push(link.department_name);
      departmentsByMember.set(link.member_id, existing);
    }

    const members = users.map((user) => ({
      id: user.id,
      name: user.agent_code ?? user.slug ?? null,
      email: user.email,
      departments: departmentsByMember.get(user.id) ?? []
    }));

    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
