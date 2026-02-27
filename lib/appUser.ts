import { prisma } from '@/lib/prisma';

export const SYSTEM_USER_ID = 'local-single-user';

export async function ensureAppUser() {
  return prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: {
      id: SYSTEM_USER_ID,
      name: 'Local User',
      email: 'local@example.com'
    },
    update: {}
  });
}
