import { prisma } from '../src/lib/prisma';

async function setupTestData() {
  console.log('🔧 Setting up test data...\n');

  try {
    // 1. Create a test user
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: 'hashed_password_here', // In production, use bcrypt
        name: 'Test User',
        role: 'ADMIN',
      },
    });
    console.log('✅ User created:', user.email);

    // 2. Create a test business
    const business = await prisma.business.upsert({
      where: { id: 'test-business-1' },
      update: {},
      create: {
        id: 'test-business-1',
        name: 'Test Coffee Shop',
        domain: 'restaurant',
        description: 'A test coffee shop for development',
        isActive: true,
        userId: user.id,
      },
    });
    console.log('✅ Business created:', business.name);

    // 3. Add your Twilio phone number
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

    const phoneNumber = await prisma.phoneNumber.upsert({
      where: { number: twilioNumber },
      update: {},
      create: {
        number: twilioNumber,
        friendlyName: 'Main Line',
        businessId: business.id,
      },
    });
    console.log('✅ Phone number added:', phoneNumber.number);

    // 4. Add configuration
    await prisma.configuration.upsert({
      where: {
        businessId_key: {
          businessId: business.id,
          key: 'ai_personality',
        },
      },
      update: {
        value: { text: 'friendly, warm, and professional' },
      },
      create: {
        businessId: business.id,
        key: 'ai_personality',
        value: { text: 'friendly, warm, and professional' },
        type: 'json',
      },
    });

    await prisma.configuration.upsert({
      where: {
        businessId_key: {
          businessId: business.id,
          key: 'greeting_message',
        },
      },
      update: {
        value: {
          text: 'Hello! Thanks for calling Test Coffee Shop. How can I help you today?',
        },
      },
      create: {
        businessId: business.id,
        key: 'greeting_message',
        value: {
          text: 'Hello! Thanks for calling Test Coffee Shop. How can I help you today?',
        },
        type: 'json',
      },
    });

    console.log('✅ Configurations added');

    console.log('\n🎉 Test data setup complete!\n');
    console.log('📝 Summary:');
    console.log(`   Business ID: ${business.id}`);
    console.log(`   Phone Number: ${phoneNumber.number}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Update TWILIO_PHONE_NUMBER in .env to match above');
    console.log('   2. Start server: npm run dev');
    console.log('   3. Start ngrok: ngrok http 3000');
    console.log('   4. Configure Twilio webhook');
    console.log('   5. Make a test call!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();
