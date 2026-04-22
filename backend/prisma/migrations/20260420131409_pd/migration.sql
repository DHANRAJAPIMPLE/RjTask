/*
  Warnings:

  - A unique constraint covering the columns `[ip_address]` on the table `user_activity` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_activity_ip_address_key" ON "user_activity"("ip_address");
