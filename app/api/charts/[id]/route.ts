import { NextResponse } from 'next/server';
import { ensureAppUser, SYSTEM_USER_ID } from '@/lib/appUser';
import { isValidDeletePassword } from '@/lib/deleteAuth';
import { prisma } from '@/lib/prisma';
import { chartSchema } from '@/lib/validation';
import { rowsTotal } from '@/lib/giftChart';

type Context = {
  params: { id: string };
};

export async function GET(_: Request, { params }: Context) {
  await ensureAppUser();

  const chart = await prisma.giftChart.findFirst({
    where: {
      id: params.id,
      userId: SYSTEM_USER_ID
    }
  });

  if (!chart) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(chart);
}

export async function PUT(request: Request, { params }: Context) {
  await ensureAppUser();

  const existing = await prisma.giftChart.findFirst({
    where: {
      id: params.id,
      userId: SYSTEM_USER_ID
    }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = chartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (rowsTotal(parsed.data.rows) !== parsed.data.goalAmount) {
    return NextResponse.json({ error: 'Chart total must equal campaign goal exactly.' }, { status: 400 });
  }

  const chart = await prisma.giftChart.update({
    where: { id: params.id },
    data: {
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

  return NextResponse.json(chart);
}

export async function DELETE(request: Request, { params }: Context) {
  await ensureAppUser();

  const existing = await prisma.giftChart.findFirst({
    where: {
      id: params.id,
      userId: SYSTEM_USER_ID
    }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (!isValidDeletePassword(body?.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
  }

  await prisma.giftChart.delete({
    where: { id: params.id }
  });

  return NextResponse.json({ ok: true });
}
