-- DropForeignKey
ALTER TABLE "user_access" DROP CONSTRAINT "user_access_role_code_fkey";

-- AlterTable
ALTER TABLE "user_access" ALTER COLUMN "role_code" DROP NOT NULL,
ALTER COLUMN "access_type" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "roles"("role_code") ON DELETE SET NULL ON UPDATE CASCADE;
