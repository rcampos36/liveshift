-- AlterEnum
ALTER TYPE "CompanyRole" ADD VALUE IF NOT EXISTS 'BILLING_ADMIN';

-- AlterTable
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "dashboardRevision" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "BoardItemStatus" AS ENUM ('ACTIVE', 'CLEARED');

-- CreateEnum
CREATE TYPE "MenuItemAvailability" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'EIGHTY_SIXED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RestaurantTaskType" AS ENUM ('OPENING', 'CLOSING', 'CLEANING', 'PREP', 'MAINTENANCE', 'MANAGER', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskDepartment" AS ENUM ('KITCHEN', 'FRONT_OF_HOUSE', 'BAR', 'MANAGEMENT', 'FACILITIES', 'OTHER');

-- CreateEnum
CREATE TYPE "SalesGoalPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('MEAT', 'SEAFOOD', 'PRODUCE', 'DAIRY', 'DRY_GOODS', 'ALCOHOL', 'BEVERAGES', 'PAPER_GOODS', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentType" AS ENUM ('CREATE', 'COUNT', 'ADJUST', 'IMPORT', 'UPDATE', 'DEACTIVATE', 'ACTIVATE');

-- CreateEnum
CREATE TYPE "WasteReason" AS ENUM ('SPOILAGE', 'OVERCOOKED', 'INCORRECT_ORDER', 'DROPPED', 'EXPIRED', 'CUSTOMER_RETURN', 'PREP_WASTE', 'EMPLOYEE_MEAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceShift" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'LATE');

-- CreateEnum
CREATE TYPE "StaffPosition" AS ENUM ('SERVER', 'BARTENDER', 'HOST', 'BUSSER', 'COOK', 'PREP_COOK', 'DISHWASHER', 'KITCHEN_MANAGER', 'MANAGER', 'GENERAL_MANAGER');

-- CreateEnum
CREATE TYPE "BreakStatus" AS ENUM ('ON_DUTY', 'ON_BREAK');

-- CreateEnum
CREATE TYPE "ManagerLogCategory" AS ENUM ('STAFFING', 'CUSTOMER_COMPLAINT', 'MAINTENANCE', 'INVENTORY_SHORTAGE', 'VENDOR', 'INCIDENT', 'SHIFT_NOTE', 'CASH', 'GENERAL');

-- CreateEnum
CREATE TYPE "ManagerLogPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PosProviderKind" AS ENUM ('TOAST', 'SQUARE', 'CLOVER', 'MANUAL');

-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('DISABLED', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "IntegrationResource" AS ENUM ('SALES', 'ORDERS', 'EMPLOYEES', 'MENU_ITEMS', 'PAYMENTS');

-- CreateEnum
CREATE TYPE "IntegrationSyncStatus" AS ENUM ('STARTED', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "IntegrationSyncTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "RestaurantOrderStatus" AS ENUM ('OPEN', 'CLOSED', 'VOIDED');

-- CreateEnum
CREATE TYPE "RestaurantPaymentMethod" AS ENUM ('CARD', 'CASH', 'GIFT', 'OTHER');

-- CreateEnum
CREATE TYPE "RestaurantPaymentStatus" AS ENUM ('APPROVED', 'VOIDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionChangeType" AS ENUM ('CREATED', 'ACTIVATED', 'UPGRADED', 'DOWNGRADED', 'QUANTITY_CHANGED', 'STATUS_CHANGED', 'CANCELLED', 'REACTIVATED');

-- CreateTable
CREATE TABLE "DailyOperations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "salesAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salesGoal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "covers" INTEGER NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grossSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "foodSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "alcoholSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comps" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "voids" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyOperations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesGoal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "period" "SalesGoalPeriod" NOT NULL,
    "periodStart" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemStatus" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "status" "MenuItemAvailability" NOT NULL,
    "remainingQuantity" DECIMAL(12,2),
    "reason" TEXT,
    "estimatedAvailableAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "MenuItemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EightySixItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BoardItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),

    CONSTRAINT "EightySixItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL DEFAULT 'OTHER',
    "sku" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'ea',
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "parLevel" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reorderPoint" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "InventoryAdjustmentType" NOT NULL,
    "quantityBefore" DECIMAL(12,2) NOT NULL,
    "quantityAfter" DECIMAL(12,2) NOT NULL,
    "quantityDelta" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "businessDate" DATE NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'ea',
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reason" "WasteReason" NOT NULL DEFAULT 'OTHER',
    "employeeId" TEXT,
    "shift" "ServiceShift" NOT NULL DEFAULT 'DINNER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerIssue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ManagerIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" "RestaurantTaskType" NOT NULL DEFAULT 'OTHER',
    "department" "TaskDepartment" NOT NULL DEFAULT 'OTHER',
    "assignedEmployeeId" TEXT,
    "assignedRole" "StaffPosition",
    "dueAt" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "templateId" TEXT,
    "templateRunId" TEXT,
    "businessDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "taskType" "RestaurantTaskType" NOT NULL DEFAULT 'OTHER',
    "department" "TaskDepartment" NOT NULL DEFAULT 'OTHER',
    "assignedRole" "StaffPosition",
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "dueTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "assignedRole" "StaffPosition",
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "TaskTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingEmployee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "station" TEXT,
    "clockedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockedOutAt" TIMESTAMP(3),

    CONSTRAINT "WorkingEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantEmployee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" "StaffPosition" NOT NULL DEFAULT 'SERVER',
    "hourlyRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffShift" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employee" TEXT NOT NULL,
    "position" "StaffPosition" NOT NULL,
    "businessDate" DATE NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "clockedIn" TIMESTAMP(3),
    "clockedOut" TIMESTAMP(3),
    "callout" BOOLEAN NOT NULL DEFAULT false,
    "late" BOOLEAN NOT NULL DEFAULT false,
    "breakStatus" "BreakStatus" NOT NULL DEFAULT 'ON_DUTY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "ManagerLogCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "ManagerLogPriority" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ManagerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "provider" "PosProviderKind" NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'DISABLED',
    "externalLocationId" TEXT,
    "encryptedCredentials" TEXT,
    "credentialFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "scheduledEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "nextSyncAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "useSampleData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSyncLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" "PosProviderKind" NOT NULL,
    "resource" "IntegrationResource" NOT NULL,
    "trigger" "IntegrationSyncTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "IntegrationSyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsImported" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "details" JSONB,

    CONSTRAINT "IntegrationSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationExternalRef" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "resource" "IntegrationResource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationExternalRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "status" "RestaurantOrderStatus" NOT NULL DEFAULT 'CLOSED',
    "netTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comps" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "foodTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "alcoholTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantPayment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "method" "RestaurantPaymentMethod" NOT NULL DEFAULT 'OTHER',
    "status" "RestaurantPaymentStatus" NOT NULL DEFAULT 'APPROVED',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT,
    "restaurantName" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountPerLocation" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySubscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "locationQuantity" INTEGER NOT NULL DEFAULT 1,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "pastDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionChange" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" "SubscriptionChangeType" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountPerLocation" DECIMAL(12,2) NOT NULL,
    "locationQuantity" INTEGER NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "planName" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "sentTo" TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);



-- CreateIndex
CREATE INDEX "DailyOperations_companyId_locationId_idx" ON "DailyOperations"("companyId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyOperations_locationId_businessDate_key" ON "DailyOperations"("locationId", "businessDate");

-- CreateIndex
CREATE INDEX "SalesGoal_companyId_locationId_period_idx" ON "SalesGoal"("companyId", "locationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "SalesGoal_locationId_period_periodStart_key" ON "SalesGoal"("locationId", "period", "periodStart");

-- CreateIndex
CREATE INDEX "MenuItem_companyId_locationId_name_idx" ON "MenuItem"("companyId", "locationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_locationId_name_key" ON "MenuItem"("locationId", "name");

-- CreateIndex
CREATE INDEX "MenuItemStatus_companyId_locationId_status_resolvedAt_idx" ON "MenuItemStatus"("companyId", "locationId", "status", "resolvedAt");

-- CreateIndex
CREATE INDEX "MenuItemStatus_menuItemId_resolvedAt_idx" ON "MenuItemStatus"("menuItemId", "resolvedAt");

-- CreateIndex
CREATE INDEX "MenuItemStatus_locationId_createdAt_idx" ON "MenuItemStatus"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "EightySixItem_companyId_locationId_status_idx" ON "EightySixItem"("companyId", "locationId", "status");

-- CreateIndex
CREATE INDEX "InventoryItem_companyId_locationId_active_idx" ON "InventoryItem"("companyId", "locationId", "active");

-- CreateIndex
CREATE INDEX "InventoryItem_locationId_sku_idx" ON "InventoryItem"("locationId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_locationId_name_key" ON "InventoryItem"("locationId", "name");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_companyId_locationId_createdAt_idx" ON "InventoryAdjustment"("companyId", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_inventoryItemId_createdAt_idx" ON "InventoryAdjustment"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "WasteEntry_companyId_locationId_businessDate_idx" ON "WasteEntry"("companyId", "locationId", "businessDate");

-- CreateIndex
CREATE INDEX "WasteEntry_locationId_reason_idx" ON "WasteEntry"("locationId", "reason");

-- CreateIndex
CREATE INDEX "WasteEntry_employeeId_idx" ON "WasteEntry"("employeeId");

-- CreateIndex
CREATE INDEX "ManagerIssue_companyId_locationId_status_idx" ON "ManagerIssue"("companyId", "locationId", "status");

-- CreateIndex
CREATE INDEX "Task_companyId_locationId_status_idx" ON "Task"("companyId", "locationId", "status");

-- CreateIndex
CREATE INDEX "Task_companyId_locationId_businessDate_idx" ON "Task"("companyId", "locationId", "businessDate");

-- CreateIndex
CREATE INDEX "Task_companyId_locationId_taskType_idx" ON "Task"("companyId", "locationId", "taskType");

-- CreateIndex
CREATE INDEX "TaskTemplate_companyId_locationId_idx" ON "TaskTemplate"("companyId", "locationId");

-- CreateIndex
CREATE INDEX "TaskTemplateItem_templateId_sortOrder_idx" ON "TaskTemplateItem"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkingEmployee_companyId_locationId_clockedOutAt_idx" ON "WorkingEmployee"("companyId", "locationId", "clockedOutAt");

-- CreateIndex
CREATE INDEX "RestaurantEmployee_companyId_locationId_active_idx" ON "RestaurantEmployee"("companyId", "locationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantEmployee_locationId_name_key" ON "RestaurantEmployee"("locationId", "name");

-- CreateIndex
CREATE INDEX "StaffShift_companyId_locationId_businessDate_idx" ON "StaffShift"("companyId", "locationId", "businessDate");

-- CreateIndex
CREATE INDEX "ManagerLog_companyId_locationId_businessDate_idx" ON "ManagerLog"("companyId", "locationId", "businessDate");

-- CreateIndex
CREATE INDEX "ManagerLog_companyId_locationId_resolved_idx" ON "ManagerLog"("companyId", "locationId", "resolved");

-- CreateIndex
CREATE INDEX "IntegrationConnection_companyId_locationId_idx" ON "IntegrationConnection"("companyId", "locationId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_scheduledEnabled_nextSyncAt_idx" ON "IntegrationConnection"("scheduledEnabled", "nextSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_locationId_provider_key" ON "IntegrationConnection"("locationId", "provider");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_companyId_locationId_startedAt_idx" ON "IntegrationSyncLog"("companyId", "locationId", "startedAt");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_connectionId_startedAt_idx" ON "IntegrationSyncLog"("connectionId", "startedAt");

-- CreateIndex
CREATE INDEX "IntegrationExternalRef_companyId_locationId_resource_idx" ON "IntegrationExternalRef"("companyId", "locationId", "resource");

-- CreateIndex
CREATE INDEX "IntegrationExternalRef_internalId_idx" ON "IntegrationExternalRef"("internalId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationExternalRef_connectionId_resource_externalId_key" ON "IntegrationExternalRef"("connectionId", "resource", "externalId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_companyId_locationId_businessDate_idx" ON "RestaurantOrder"("companyId", "locationId", "businessDate");

-- CreateIndex
CREATE INDEX "RestaurantPayment_companyId_locationId_processedAt_idx" ON "RestaurantPayment"("companyId", "locationId", "processedAt");

-- CreateIndex
CREATE INDEX "RestaurantPayment_orderId_idx" ON "RestaurantPayment"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_locationId_createdAt_idx" ON "AuditLog"("companyId", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_locationId_entity_entityId_idx" ON "AuditLog"("locationId", "entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_code_key" ON "BillingPlan"("code");

-- CreateIndex
CREATE INDEX "BillingPrice_planId_active_idx" ON "BillingPrice"("planId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPrice_planId_interval_currency_key" ON "BillingPrice"("planId", "interval", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySubscription_companyId_key" ON "CompanySubscription"("companyId");

-- CreateIndex
CREATE INDEX "CompanySubscription_status_idx" ON "CompanySubscription"("status");

-- CreateIndex
CREATE INDEX "CompanySubscription_planId_idx" ON "CompanySubscription"("planId");

-- CreateIndex
CREATE INDEX "SubscriptionChange_companyId_createdAt_idx" ON "SubscriptionChange"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionChange_subscriptionId_createdAt_idx" ON "SubscriptionChange"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_number_key" ON "BillingInvoice"("number");

-- CreateIndex
CREATE INDEX "BillingInvoice_companyId_createdAt_idx" ON "BillingInvoice"("companyId", "createdAt");



-- AddForeignKey
ALTER TABLE "DailyOperations" ADD CONSTRAINT "DailyOperations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOperations" ADD CONSTRAINT "DailyOperations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesGoal" ADD CONSTRAINT "SalesGoal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesGoal" ADD CONSTRAINT "SalesGoal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemStatus" ADD CONSTRAINT "MenuItemStatus_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemStatus" ADD CONSTRAINT "MenuItemStatus_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemStatus" ADD CONSTRAINT "MenuItemStatus_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemStatus" ADD CONSTRAINT "MenuItemStatus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemStatus" ADD CONSTRAINT "MenuItemStatus_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EightySixItem" ADD CONSTRAINT "EightySixItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EightySixItem" ADD CONSTRAINT "EightySixItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteEntry" ADD CONSTRAINT "WasteEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteEntry" ADD CONSTRAINT "WasteEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteEntry" ADD CONSTRAINT "WasteEntry_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteEntry" ADD CONSTRAINT "WasteEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerIssue" ADD CONSTRAINT "ManagerIssue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerIssue" ADD CONSTRAINT "ManagerIssue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "RestaurantEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplateItem" ADD CONSTRAINT "TaskTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingEmployee" ADD CONSTRAINT "WorkingEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingEmployee" ADD CONSTRAINT "WorkingEmployee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantEmployee" ADD CONSTRAINT "RestaurantEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantEmployee" ADD CONSTRAINT "RestaurantEmployee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "RestaurantEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerLog" ADD CONSTRAINT "ManagerLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerLog" ADD CONSTRAINT "ManagerLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerLog" ADD CONSTRAINT "ManagerLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerLog" ADD CONSTRAINT "ManagerLog_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationExternalRef" ADD CONSTRAINT "IntegrationExternalRef_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationExternalRef" ADD CONSTRAINT "IntegrationExternalRef_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationExternalRef" ADD CONSTRAINT "IntegrationExternalRef_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPayment" ADD CONSTRAINT "RestaurantPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPayment" ADD CONSTRAINT "RestaurantPayment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPayment" ADD CONSTRAINT "RestaurantPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPrice" ADD CONSTRAINT "BillingPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "BillingPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionChange" ADD CONSTRAINT "SubscriptionChange_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionChange" ADD CONSTRAINT "SubscriptionChange_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CompanySubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionChange" ADD CONSTRAINT "SubscriptionChange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CompanySubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

