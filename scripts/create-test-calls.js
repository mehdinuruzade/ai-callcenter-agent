const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const statuses = ['completed', 'in-progress', 'failed'];
const sentiments = ['positive', 'neutral', 'negative'];
const transcripts = [
  'Customer called to inquire about appointment availability. Provided available slots and scheduled for next Tuesday at 2 PM.',
  'Technical support call regarding login issues. Guided customer through password reset process. Issue resolved successfully.',
  'Billing inquiry about recent invoice. Explained charges and provided payment options. Customer satisfied with explanation.',
  'Product information request. Described features and pricing. Customer interested in premium plan.',
  'Complaint about service delay. Apologized and offered compensation. Scheduled priority service for tomorrow.',
];

async function main() {
  // Get first business
  const business = await prisma.business.findFirst();
  
  if (!business) {
    console.log('❌ No businesses found. Create a business first!');
    return;
  }

  console.log(`Creating test calls for business: ${business.name}\n`);

  // Create 10 test calls
  for (let i = 0; i < 10; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const transcript = transcripts[Math.floor(Math.random() * transcripts.length)];
    const duration = Math.floor(Math.random() * 300) + 30; // 30-330 seconds

    await prisma.callLog.create({
      data: {
        callSid: `CA${Date.now()}${i}`,
        fromNumber: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        toNumber: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        status,
        duration,
        transcript,
        summary: transcript.substring(0, 100) + '...',
        sentiment,
        resolvedIssue: Math.random() > 0.3,
        businessId: business.id,
      },
    });

    console.log(`✅ Created call ${i + 1}/10`);
  }

  console.log('\n🎉 Test calls created successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
