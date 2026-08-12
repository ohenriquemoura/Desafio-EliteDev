import { PrismaClient, Role, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Demo@2026';

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@elitedev.local' },
    update: {},
    create: {
      name: 'Organizador Demo',
      email: 'organizer@elitedev.local',
      passwordHash,
      role: Role.ORGANIZER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'client1@elitedev.local' },
    update: {},
    create: {
      name: 'Cliente Um',
      email: 'client1@elitedev.local',
      passwordHash,
      role: Role.CLIENT,
    },
  });

  await prisma.user.upsert({
    where: { email: 'client2@elitedev.local' },
    update: {},
    create: {
      name: 'Cliente Dois',
      email: 'client2@elitedev.local',
      passwordHash,
      role: Role.CLIENT,
    },
  });

  await prisma.user.upsert({
    where: { email: 'gate@elitedev.local' },
    update: {},
    create: {
      name: 'Portaria Demo',
      email: 'gate@elitedev.local',
      passwordHash,
      role: Role.GATE,
    },
  });

  const existingEvent = await prisma.event.findFirst({
    where: {
      organizerId: organizer.id,
      tmdbMovieId: 550,
      title: 'Clube da Luta',
    },
  });

  if (!existingEvent) {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 14);
    startsAt.setHours(20, 0, 0, 0);

    await prisma.event.create({
      data: {
        organizerId: organizer.id,
        tmdbMovieId: 550,
        title: 'Clube da Luta',
        posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        overview:
          'Um homem deprimido que sofre de insônia conhece um estranho vendedor de sabonetes chamado Tyler Durden.',
        venue: 'Cine Elite — Sala 1, São Paulo',
        startsAt,
        capacity: 120,
        heldCount: 0,
        soldCount: 0,
        priceCents: 4500,
        status: EventStatus.PUBLISHED,
      },
    });
  }

  console.log('Seed concluído.');
  console.log('Contas (senha para todas: Demo@2026):');
  console.log('  organizer@elitedev.local  ORGANIZER');
  console.log('  client1@elitedev.local    CLIENT');
  console.log('  client2@elitedev.local    CLIENT');
  console.log('  gate@elitedev.local       GATE');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
