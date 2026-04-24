/*
  Warnings:

  - You are about to drop the `company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `company_mapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `company_onboarding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `group_company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `org_structure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `org_structure_req` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_access` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_mapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_onboarding` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "company_mapping" DROP CONSTRAINT "company_mapping_company_id_fkey";

-- DropForeignKey
ALTER TABLE "company_mapping" DROP CONSTRAINT "company_mapping_group_id_fkey";

-- DropForeignKey
ALTER TABLE "company_onboarding" DROP CONSTRAINT "company_onboarding_approver_id_fkey";

-- DropForeignKey
ALTER TABLE "company_onboarding" DROP CONSTRAINT "company_onboarding_initiator_id_fkey";

-- DropForeignKey
ALTER TABLE "org_structure" DROP CONSTRAINT "org_structure_company_id_fkey";

-- DropForeignKey
ALTER TABLE "org_structure" DROP CONSTRAINT "org_structure_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "org_structure_req" DROP CONSTRAINT "org_structure_req_approver_id_fkey";

-- DropForeignKey
ALTER TABLE "org_structure_req" DROP CONSTRAINT "org_structure_req_company_id_fkey";

-- DropForeignKey
ALTER TABLE "org_structure_req" DROP CONSTRAINT "org_structure_req_initiator_id_fkey";

-- DropForeignKey
ALTER TABLE "user_access" DROP CONSTRAINT "user_access_company_id_fkey";

-- DropForeignKey
ALTER TABLE "user_access" DROP CONSTRAINT "user_access_node_id_fkey";

-- DropForeignKey
ALTER TABLE "user_access" DROP CONSTRAINT "user_access_role_code_fkey";

-- DropForeignKey
ALTER TABLE "user_access" DROP CONSTRAINT "user_access_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_activity" DROP CONSTRAINT "user_activity_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_mapping" DROP CONSTRAINT "user_mapping_company_id_fkey";

-- DropForeignKey
ALTER TABLE "user_mapping" DROP CONSTRAINT "user_mapping_reporting_manager_fkey";

-- DropForeignKey
ALTER TABLE "user_mapping" DROP CONSTRAINT "user_mapping_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_onboarding" DROP CONSTRAINT "user_onboarding_approver_id_fkey";

-- DropForeignKey
ALTER TABLE "user_onboarding" DROP CONSTRAINT "user_onboarding_initiator_id_fkey";

-- DropTable
DROP TABLE "company";

-- DropTable
DROP TABLE "company_mapping";

-- DropTable
DROP TABLE "company_onboarding";

-- DropTable
DROP TABLE "group_company";

-- DropTable
DROP TABLE "org_structure";

-- DropTable
DROP TABLE "org_structure_req";

-- DropTable
DROP TABLE "roles";

-- DropTable
DROP TABLE "user";

-- DropTable
DROP TABLE "user_access";

-- DropTable
DROP TABLE "user_activity";

-- DropTable
DROP TABLE "user_mapping";

-- DropTable
DROP TABLE "user_onboarding";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "gstNumber" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brandName" TEXT NOT NULL,
    "iecode" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reportingManager" TEXT,
    "status" "Status" NOT NULL,
    "designation" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMapping" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "version" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "forceLogToken" TEXT,
    "expiryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOnboarding" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "approverId" TEXT,
    "groupCode" TEXT,
    "companyCode" TEXT,
    "data" JSONB,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalRemark" TEXT,

    CONSTRAINT "UserOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyOnboarding" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "approverId" TEXT,
    "data" JSONB,
    "groupCode" TEXT,
    "companyCode" TEXT NOT NULL,
    "onboardedType" "OnboardedType" NOT NULL DEFAULT 'new',
    "status" "OnboardingStatus" NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalRemark" TEXT,

    CONSTRAINT "CompanyOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgStructureReq" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "approverId" TEXT,
    "data" JSONB NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgStructureReq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgStructure" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nodePath" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roles" (
    "roleCode" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "permissionLevel" TEXT,
    "view" BOOLEAN NOT NULL DEFAULT false,
    "modify" BOOLEAN NOT NULL DEFAULT false,
    "approve" BOOLEAN NOT NULL DEFAULT false,
    "initiate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("roleCode")
);

-- CreateTable
CREATE TABLE "UserAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleCode" TEXT,
    "nodeId" TEXT NOT NULL,
    "accessType" TEXT,
    "companyId" TEXT NOT NULL,
    "isGlobalAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_gstNumber_key" ON "Company"("gstNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_iecode_key" ON "Company"("iecode");

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyCode_key" ON "Company"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCompany_groupCode_key" ON "GroupCompany"("groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyOnboarding_companyCode_key" ON "CompanyOnboarding"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "OrgStructure_nodePath_key" ON "OrgStructure"("nodePath");

-- CreateIndex
CREATE UNIQUE INDEX "Roles_roleName_key" ON "Roles"("roleName");

-- AddForeignKey
ALTER TABLE "UserMapping" ADD CONSTRAINT "UserMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMapping" ADD CONSTRAINT "UserMapping_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMapping" ADD CONSTRAINT "UserMapping_reportingManager_fkey" FOREIGN KEY ("reportingManager") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMapping" ADD CONSTRAINT "CompanyMapping_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMapping" ADD CONSTRAINT "CompanyMapping_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GroupCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOnboarding" ADD CONSTRAINT "UserOnboarding_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOnboarding" ADD CONSTRAINT "UserOnboarding_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOnboarding" ADD CONSTRAINT "CompanyOnboarding_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOnboarding" ADD CONSTRAINT "CompanyOnboarding_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgStructureReq" ADD CONSTRAINT "OrgStructureReq_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgStructureReq" ADD CONSTRAINT "OrgStructureReq_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgStructureReq" ADD CONSTRAINT "OrgStructureReq_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgStructure" ADD CONSTRAINT "OrgStructure_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgStructure" ADD CONSTRAINT "OrgStructure_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Roles"("roleCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "OrgStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
