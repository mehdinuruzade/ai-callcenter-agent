const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultConfigs = {
  ai_personality: {
    value: 'friendly and professional',
    type: 'string',
  },
  greeting_message: {
    value: 'Hello! Thank you for calling. How can I help you today?',
    type: 'string',
  },
  max_call_duration: {
    value: 300,
    type: 'number',
  },
  enable_voicemail: {
    value: true,
    type: 'boolean',
  },
  voicemail_message: {
    value: 'Sorry we missed your call. Please leave a message and we will get back to you soon.',
    type: 'string',
  },
  transfer_number: {
    value: '',
    type: 'string',
  },
  enable_transfer: {
    value: false,
    type: 'boolean',
  },
  operating_hours_message: {
    value: 'We are currently closed. Our hours are Monday-Friday 9 AM to 5 PM.',
    type: 'string',
  },
  language: {
    value: 'en',
    type: 'string',
  },
  voice_speed: {
    value: 1.0,
    type: 'number',
  },
  conversation_style: {
    value: 'concise',
    type: 'string',
  },
};

async function main() {
  const businesses = await prisma.business.findMany();

  if (businesses.length === 0) {
    console.log('❌ No businesses found. Create a business first!');
    return;
  }

  for (const business of businesses) {
    console.log(`\n📝 Setting up configs for: ${business.name}`);

    for (const [key, config] of Object.entries(defaultConfigs)) {
      await prisma.configuration.upsert({
        where: {
          businessId_key: {
            businessId: business.id,
            key,
          },
        },
        update: {
          value: config.value,
          type: config.type,
        },
        create: {
          businessId: business.id,
          key,
          value: config.value,
          type: config.type,
        },
      });
      console.log(`  ✅ ${key}`);
    }
  }

  console.log('\n🎉 Default configurations initialized!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
