import { NextResponse } from 'next/server';
import { ensureAppUser, SYSTEM_USER_ID } from '@/lib/appUser';
import { isValidDeletePassword } from '@/lib/deleteAuth';
import { prisma } from '@/lib/prisma';
import { chartSchema } from '@/lib/validation';
import { rowsTotal } from '@/lib/giftChart';

export async function GET() {
  await ensureAppUser();

  const charts = await prisma.giftChart.findMany({
    where: { userId: SYSTEM_USER_ID },
    orderBy: { updatedAt: 'desc' }
  });

  return NextResponse.json(charts);
}

export async function POST(request: Request) {
  await ensureAppUser();

  const body = await request.json();
  const parsed = chartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (rowsTotal(parsed.data.rows) !== parsed.data.goalAmount) {
    return NextResponse.json({ error: 'Chart total must equal campaign goal exactly.' }, { status: 400 });
  }

  const chart = await prisma.giftChart.create({
    data: {
      userId: SYSTEM_USER_ID,
      projectName: parsed.data.projectName,
      goalAmount: parsed.data.goalAmount,
      tiersCount: parsed.data.tiersCount,
      leadGiftAmount: parsed.data.leadGiftAmount,
      chartJson: parsed.data.rows,
      revisions: {
        create: {
          chartJson: parsed.data.rows
        }
      }
    }
  });

  return NextResponse.json(chart, { status: 201 });
}

export async function DELETE(request: Request) {
  await ensureAppUser();

  const body = await request.json().catch(() => ({}));
  if (!isValidDeletePassword(body?.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
  }

  await prisma.giftChart.deleteMany({
    where: { userId: SYSTEM_USER_ID }
  });

  return NextResponse.json({ ok: true });
}
