const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Force creating admin user...\n');
  
  // Delete ALL users first
  const deleted = await prisma.user.deleteMany({});
  console.log(`🗑️  Deleted ${deleted.count} existing users`);

  // Create fresh admin with EXACTLY this password
  const plainPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  console.log('Creating admin with:');
  console.log('  Email: admin@callcenter.com');
  console.log('  Password: admin123');
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@callcenter.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('\n✅ Admin created!');
  console.log('ID:', admin.id);
  
  // Test the password immediately
  const testMatch = await bcrypt.compare(plainPassword, admin.password);
  console.log('\n🧪 Password test:', testMatch ? '✅ MATCHES' : '❌ DOES NOT MATCH');
  
  if (!testMatch) {
    console.log('⚠️  WARNING: Password hash verification failed!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
