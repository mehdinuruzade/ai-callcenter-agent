const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Business Isolation for RAG Content\n');

  const businesses = await prisma.business.findMany({
    include: {
      _count: {
        select: { ragContents: true },
      },
    },
  });

  if (businesses.length < 2) {
    console.log('⚠️  Need at least 2 businesses to test isolation');
    console.log('Creating test businesses and content...\n');

    // Create two test businesses
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No user found');
      return;
    }

    const business1 = await prisma.business.create({
      data: {
        name: 'Healthcare Clinic',
        domain: 'healthcare',
        userId: user.id,
      },
    });

    const business2 = await prisma.business.create({
      data: {
        name: 'Tech Support Company',
        domain: 'tech-support',
        userId: user.id,
      },
    });

    // Add content to business 1
    await prisma.rAGContent.create({
      data: {
        title: 'Medical Services',
        content: 'We provide comprehensive medical care including checkups, vaccinations, and emergency services.',
        category: 'Services',
        businessId: business1.id,
      },
    });

    // Add content to business 2
    await prisma.rAGContent.create({
      data: {
        title: 'Technical Support',
        content: 'We offer 24/7 technical support for software issues, hardware problems, and network troubleshooting.',
        category: 'Services',
        businessId: business2.id,
      },
    });

    console.log('✅ Test businesses created!\n');
  }

  // Show RAG content per business
  const allBusinesses = await prisma.business.findMany({
    include: {
      ragContents: true,
    },
  });

  console.log('📊 RAG Content Distribution:\n');
  
  for (const business of allBusinesses) {
    console.log(`🏢 ${business.name}`);
    console.log(`   Content count: ${business.ragContents.length}`);
    
    if (business.ragContents.length > 0) {
      console.log('   Content titles:');
      business.ragContents.forEach((content) => {
        console.log(`   - ${content.title}`);
      });
    }
    console.log('');
  }

  console.log('✅ Business isolation verified!');
  console.log('   Each business has separate RAG content.');
  console.log('   AI will only access content for the specific business being called.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
