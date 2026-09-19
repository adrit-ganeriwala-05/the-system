import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Vercel Cron hits this daily so Supabase sees real database activity and never triggers
 * its free-tier auto-pause (which kicks in after ~7 days of inactivity). The query itself
 * has to be real — a route that just returns 200 without touching Postgres wouldn't count
 * as activity from Supabase's side.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
