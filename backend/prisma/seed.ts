import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Roles
  const roles = [
    {
      roleCode: 'SA1',
      roleName: 'Super Admin',
      category: 'Management',
      subCategory: 'Executive',
      permissionLevel: 'Global',
      view: true,
      modify: true,
      approve: true,
      initiate: true,
    },
    {
      roleCode: 'ADM1',
      roleName: 'Administrator',
      category: 'Operations',
      subCategory: 'Head Office',
      permissionLevel: 'Company',
      view: true,
      modify: true,
      approve: true,
      initiate: true,
    },
    {
      roleCode: 'BM1',
      roleName: 'Branch Manager',
      category: 'Operations',
      subCategory: 'Branch',
      permissionLevel: 'Location',
      view: true,
      modify: true,
      approve: false,
      initiate: true,
    },
    {
      roleCode: 'OPM1',
      roleName: 'Operations Manager',
      category: 'Operations',
      subCategory: 'Department',
      permissionLevel: 'Department',
      view: true,
      modify: true,
      approve: false,
      initiate: true,
    },
  ];

  for (const role of roles) {
    await prisma.roles.upsert({
      where: { roleCode: role.roleCode },
      update: role,
      create: role,
    });
  }
  console.log('Roles seeded.');

  // 2. Seed Super Admin User
  const adminPassword = await argon2.hash('Admin@123');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@globaltech.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@globaltech.com',
      password: adminPassword,
      phone: '9876543210',
    },
  });
  console.log('Super Admin user created.');

  // 3. Seed Initial Group and Company
  const group = await prisma.groupCompany.upsert({
    where: { groupCode: 'GLOBAL_GROUP' },
    update: {},
    create: {
      name: 'Global Tech Group',
      groupCode: 'GLOBAL_GROUP',
      remarks: 'Primary seeding group',
    },
  });

  const company = await prisma.company.upsert({
    where: { companyCode: 'GTSOL001' },
    update: {},
    create: {
      legalName: 'Global Tech Solutions Pvt Ltd',
      gstNumber: '27AAAAA0000A1Z5',
      address: '123 Tech Park, Mumbai, Maharashtra',
      brandName: 'GlobalTech',
      iecode: '0123456789',
      companyCode: 'GTSOL001',
      registrationDate: new Date('2023-01-01'),
    },
  });

  await prisma.companyMapping.upsert({
    where: { id: 'default-mapping' }, // Note: Upsert needs a unique field. id is @id.
    update: {},
    create: {
      id: 'default-mapping',
      companyId: company.id,
      groupId: group.id,
    },
  });
  console.log('Initial Group and Company seeded.');

  // 4. Create Root Org Structure Node
  const rootNode = await prisma.orgStructure.upsert({
    where: { nodePath: 'GTSOL001.ROOT' },
    update: {},
    create: {
      companyId: company.id,
      nodePath: 'GTSOL001.ROOT',
      nodeName: 'Global Tech Solutions',
      nodeType: 'ROOT',
    },
  });
  console.log('Root Org Structure node created.');

  // 5. Map Super Admin to Company and give Global Access
  await prisma.userMapping.upsert({
    where: { id: 'admin-mapping' },
    update: {
      status: 'active',
    },
    create: {
      id: 'admin-mapping',
      userId: superAdmin.id,
      companyId: company.id,
      status: 'active',
      designation: 'CTO',
      employeeId: 'EMP001',
    },
  });

  await prisma.userAccess.upsert({
    where: { id: 'admin-access' },
    update: {},
    create: {
      id: 'admin-access',
      userId: superAdmin.id,
      roleCode: 'SA1',
      nodeId: rootNode.id,
      accessType: 'PRIMARY',
      companyId: company.id,
      isGlobalAccess: true,
    },
  });
  console.log('Super Admin mapping and global access configured.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
