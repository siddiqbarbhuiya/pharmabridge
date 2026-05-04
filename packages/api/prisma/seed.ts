import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Delete existing seed cards (idempotent: safe to re-run)
  await prisma.promoCard.deleteMany({
    where: { tags: { has: '__seed__' } },
  })

  await prisma.promoCard.createMany({
    data: [
      {
        title:        'Get Medicines Delivered in 60 Minutes',
        subtitle:     'Order from verified pharmacies near you. Track in real time.',
        badge:        '⚡ Express Delivery',
        type:         'BANNER',
        target:       'CUSTOMER',
        ctaLabel:     'Order Now',
        ctaUrl:       '/medicines',
        tags:         ['Express', 'Same Day', '__seed__'],
        displayOrder: 0,
        isActive:     true,
      },
      {
        title:        'Up to 20% Off on Diabetes Care',
        subtitle:     'Metformin, insulin & more — compare prices across pharmacies.',
        badge:        '💊 Special Offer',
        type:         'OFFER',
        target:       'ALL',
        ctaLabel:     'Shop Now',
        ctaUrl:       '/medicines?category=Diabetes',
        tags:         ['Diabetes', 'Discounts', 'Insulin', '__seed__'],
        displayOrder: 1,
        isActive:     true,
      },
      {
        title:        'Book a Doctor Consultation Today',
        subtitle:     'In-person & video consultations available at nearby pharmacies.',
        badge:        '🏥 Consult a Doctor',
        type:         'HIGHLIGHT',
        target:       'CUSTOMER',
        ctaLabel:     'Find Doctors',
        ctaUrl:       '/doctors',
        tags:         ['Consultation', 'Video', 'Specialist', '__seed__'],
        displayOrder: 2,
        isActive:     true,
      },
    ],
  })

  console.log('Seeded 3 promo cards')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
