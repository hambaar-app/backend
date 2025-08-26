import { PrismaClient, RolesEnum } from '../../generated/prisma';

const prisma = new PrismaClient();

async function seedTestAdminUser() {
  console.log('🌱 Starting test admin user seeding...');

  try {
    // Check if some admin user already exists to avoid duplicate phoneNumber or email
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: RolesEnum.admin,
      },
    });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists, skipping seeding.');
      process.exit(1);
    }

    // Create test admin user
    await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'Test',
        gender: 'male',
        phoneNumber: '09123456789',
        phoneVerifiedAt: new Date(),
        email: 'admin@example.com',
        emailVerifiedAt: new Date(),
        birthDate: new Date('1980-01-01'),
        role: RolesEnum.admin,
        wallet: {
          create: {}
        }
      },
    });

    console.log('✅ Test admin user created successfully!');
  } catch (error) {
    console.error('❌ Seeding test admin user failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedTestAdminUser()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedTestAdminUser;