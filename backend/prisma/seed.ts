import { PrismaClient, OnboardingStatus, OnboardedType, Status } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Roles
  console.log('Creating roles...');
  const roles = await Promise.all([
    prisma.roles.upsert({
      where: { roleCode: 'SUPER_ADMIN' },
      update: {},
      create: {
        roleCode: 'SUPER_ADMIN',
        roleName: 'Super Administrator',
        category: 'Admin',
        subCategory: 'Management',
        permissionLevel: 'Global',
        view: true,
        modify: true,
        approve: true,
        initiate: true,
        isActive: true,
      },
    }),
    prisma.roles.upsert({
      where: { roleCode: 'ADMIN' },
      update: {},
      create: {
        roleCode: 'ADMIN',
        roleName: 'Administrator',
        category: 'Admin',
        subCategory: 'Operations',
        permissionLevel: 'Company',
        view: true,
        modify: true,
        approve: true,
        initiate: true,
        isActive: true,
      },
    }),
    prisma.roles.upsert({
      where: { roleCode: 'USER' },
      update: {},
      create: {
        roleCode: 'USER',
        roleName: 'Standard User',
        category: 'Employee',
        subCategory: 'General',
        permissionLevel: 'Node',
        view: true,
        modify: false,
        approve: false,
        initiate: false,
        isActive: true,
      },
    }),
  ]);

  // 2. Seed Group Company
  console.log('Creating group company...');
  const group = await prisma.groupCompany.upsert({
    where: { groupCode: 'GC001' },
    update: {},
    create: {
      name: 'Global Enterprises Group',
      groupCode: 'GC001',
      remarks: 'Primary seed group',
    },
  });

  // 3. Seed Company
  console.log('Creating company...');
  const company = await prisma.company.upsert({
    where: { companyCode: 'COMP001' },
    update: {},
    create: {
      companyCode: 'COMP001',
      brandName: 'Global Tech',
      legalName: 'Global Technology Solutions Pvt Ltd',
      gstNumber: '27AAAAA0000A1Z5',
      iecode: '0123456789',
      address: '123 Tech Park, Innovation Way, Pune',
      registrationDate: new Date(),
    },
  });

  // 4. Seed Company Mapping
  console.log('Mapping company to group...');
  await prisma.companyMapping.create({
    data: {
      companyId: company.id,
      groupId: group.id,
    },
  });

  // 5. Seed Users
  console.log('Creating users...');
  const hashedPassword = await argon2.hash('Admin@123');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@globaltech.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@globaltech.com',
      password: hashedPassword,
      phone: '9876543210',
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@globaltech.com' },
    update: {},
    create: {
      name: 'Branch Manager',
      email: 'manager@globaltech.com',
      password: hashedPassword,
      phone: '9876543211',
    },
  });

  // 6. Seed User Mapping
  console.log('Mapping users to companies...');
  const adminMapping = await prisma.userMapping.create({
    data: {
      userId: superAdmin.id,
      companyId: company.id,
      status: Status.active,
      designation: 'CTO',
      employeeId: 'EMP001',
    },
  });

  await prisma.userMapping.create({
    data: {
      userId: managerUser.id,
      companyId: company.id,
      status: Status.active,
      designation: 'Operations Manager',
      employeeId: 'EMP002',
      reportingManager: superAdmin.id,
    },
  });

  // 7. Seed Org Structure
  console.log('Creating org structure...');
  const rootNode = await prisma.orgStructure.upsert({
    where: { nodePath: '1' },
    update: {},
    create: {
      companyId: company.id,
      nodePath: '1',
      nodeName: 'Global Tech HQ',
      nodeType: 'Headquarters',
    },
  });

  const itDept = await prisma.orgStructure.upsert({
    where: { nodePath: '1.2' },
    update: {},
    create: {
      companyId: company.id,
      nodePath: '1.2',
      nodeName: 'IT Department',
      nodeType: 'Department',
      parentId: rootNode.id,
    },
  });

  // 8. Seed User Access
  console.log('Granting user access...');
  await prisma.userAccess.create({
    data: {
      userId: superAdmin.id,
      roleCode: 'SUPER_ADMIN',
      nodeId: rootNode.id,
      companyId: company.id,
      isGlobalAccess: true,
      accessType: 'full',
    },
  });

  await prisma.userAccess.create({
    data: {
      userId: managerUser.id,
      roleCode: 'ADMIN',
      nodeId: itDept.id,
      companyId: company.id,
      isGlobalAccess: false,
      accessType: 'restricted',
    },
  });

  // 9. Seed Onboardings (Samples)
  console.log('Creating onboarding requests...');
  await prisma.companyOnboarding.create({
    data: {
      initiatorId: superAdmin.id,
      companyCode: 'COMP_NEW_001',
      status: OnboardingStatus.approved,
      approvedAt: new Date(),
      approverId: superAdmin.id,
      onboardedType: OnboardedType.new,
      data: { reason: 'Expansion' },
      accessibleBy: [superAdmin.id],
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
