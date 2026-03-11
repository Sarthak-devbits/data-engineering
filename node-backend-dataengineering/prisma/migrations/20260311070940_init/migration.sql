-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountClass" TEXT,
    "accountType" TEXT,
    "taxType" TEXT,
    "enablePaymentsToAccount" BOOLEAN NOT NULL DEFAULT false,
    "showInExpenseClaims" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contactId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailAddress" TEXT,
    "companyNumber" TEXT,
    "isSupplier" BOOLEAN NOT NULL DEFAULT false,
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "phone" TEXT,
    "taxNumber" TEXT,
    "accountNumber" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compositeId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "type" TEXT,
    "contactName" TEXT,
    "invoiceNumber" TEXT,
    "reference" TEXT,
    "status" TEXT,
    "date" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "fullyPaidOnDate" TIMESTAMP(3),
    "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "description" TEXT,
    "quantity" DECIMAL(18,4),
    "unitAmount" DECIMAL(18,4),
    "currencyCode" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compositeId" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "type" TEXT,
    "creditNoteNumber" TEXT,
    "contactName" TEXT,
    "status" TEXT,
    "date" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lineItems" JSONB,
    "description" TEXT,
    "quantity" DECIMAL(18,4),
    "unitAmount" DECIMAL(18,4),
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compositeId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoice" JSONB,
    "account" JSONB,
    "date" TIMESTAMP(3),
    "amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paymentType" TEXT,
    "reference" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compositeId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "type" TEXT,
    "contactName" TEXT,
    "bankAccount" JSONB,
    "date" TIMESTAMP(3),
    "reference" TEXT,
    "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lineItems" JSONB,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "currencyCode" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expenseClaimId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "status" TEXT,
    "user" JSONB,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paymentDueDate" TIMESTAMP(3),
    "reportingDate" TIMESTAMP(3),
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employeeId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "status" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "description" TEXT,
    "inventoryAssetAccountCode" TEXT,
    "purchaseDetails" JSONB,
    "unitPrice" DECIMAL(18,4),
    "totalCostPool" DECIMAL(18,4),
    "quantityOnHand" DECIMAL(18,4),
    "isTrackedAsInventory" BOOLEAN NOT NULL DEFAULT false,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchaseOrderId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "purchaseOrderNumber" TEXT,
    "contactName" TEXT,
    "reference" TEXT,
    "status" TEXT,
    "date" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "expectedArrivalDate" TIMESTAMP(3),
    "deliveryAddresses" TEXT,
    "deliveryInstructions" TEXT,
    "telephone" TEXT,
    "lineItems" JSONB,
    "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currencyCode" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receiptId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "contact" JSONB,
    "user" JSONB,
    "lineItems" JSONB,
    "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" TEXT,
    "receiptNumber" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quoteId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "quoteNumber" TEXT,
    "contactName" TEXT,
    "status" TEXT,
    "date" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "subTotal" DECIMAL(18,4),
    "totalTax" DECIMAL(18,4),
    "total" DECIMAL(18,4),
    "quoteData" JSONB,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attachmentId" TEXT NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "fileName" TEXT,
    "url" TEXT,
    "mimeType" TEXT,
    "contentLength" INTEGER,
    "invoiceId" UUID,
    "creditNoteId" UUID,
    "bankTransactionId" UUID,
    "purchaseOrderId" UUID,
    "receiptId" UUID,
    "entityType" TEXT,
    "entityXeroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journalId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "journalNumber" INTEGER NOT NULL,
    "journalDate" TIMESTAMP(3),
    "createdDateUtc" TIMESTAMP(3),
    "reference" TEXT,
    "sourceId" TEXT,
    "sourceType" TEXT,
    "contactName" TEXT,
    "bankTransactionCompositeId" TEXT,
    "paymentCompositeId" TEXT,
    "creditNoteCompositeId" TEXT,
    "invoiceCompositeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expenseClaimId" TEXT,

    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journalLineId" TEXT NOT NULL,
    "journalId" UUID NOT NULL,
    "accountId" TEXT,
    "accountCode" TEXT,
    "accountType" TEXT,
    "accountName" TEXT,
    "description" TEXT,
    "netAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grossAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxType" TEXT,
    "taxName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compositeId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "xeroUserId" TEXT NOT NULL,
    "budgetType" TEXT,
    "description" TEXT,
    "budgetLines" JSONB,
    "tracking" JSONB,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_sheet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "accountId" TEXT,
    "accountType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "value" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_and_loss" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "reportId" TEXT,
    "type" TEXT NOT NULL,
    "value" TEXT,
    "accountId" TEXT,
    "reportTitle" TEXT,
    "organisation" TEXT,
    "reportDates" TEXT NOT NULL,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_and_loss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_balance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT,
    "accountCode" TEXT,
    "debit" TEXT,
    "credit" TEXT,
    "ytdDebit" TEXT,
    "ytdCredit" TEXT,
    "reportDate" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trial_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_summary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "account" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "value" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aged_payables_by_contact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "contactId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "date" TEXT,
    "reference" TEXT,
    "dueDate" TEXT,
    "total" TEXT,
    "paid" TEXT,
    "credited" TEXT,
    "due" TEXT,
    "type" TEXT,
    "name" TEXT,
    "reportTitleDate" TEXT,
    "description" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aged_payables_by_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aged_receivables_by_contact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "contactId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "number" TEXT,
    "date" TEXT,
    "dueDate" TEXT,
    "overdue" TEXT,
    "total" TEXT,
    "paid" TEXT,
    "credited" TEXT,
    "due" TEXT,
    "type" TEXT,
    "name" TEXT,
    "reportTitleDate" TEXT,
    "description" TEXT,
    "updatedDateUtc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aged_receivables_by_contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_accountId_key" ON "accounts"("accountId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "accounts_xeroUserId_idx" ON "accounts"("xeroUserId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_accountId_userId_key" ON "accounts"("accountId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_contactId_key" ON "contacts"("contactId");

-- CreateIndex
CREATE INDEX "contacts_userId_idx" ON "contacts"("userId");

-- CreateIndex
CREATE INDEX "contacts_name_idx" ON "contacts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_contactId_userId_key" ON "contacts"("contactId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_compositeId_key" ON "invoices"("compositeId");

-- CreateIndex
CREATE INDEX "invoices_invoiceId_userId_idx" ON "invoices"("invoiceId", "userId");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_date_idx" ON "invoices"("date");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_compositeId_key" ON "credit_notes"("compositeId");

-- CreateIndex
CREATE INDEX "credit_notes_creditNoteId_userId_idx" ON "credit_notes"("creditNoteId", "userId");

-- CreateIndex
CREATE INDEX "credit_notes_userId_idx" ON "credit_notes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_compositeId_key" ON "payments"("compositeId");

-- CreateIndex
CREATE INDEX "payments_paymentId_userId_idx" ON "payments"("paymentId", "userId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_compositeId_key" ON "bank_transactions"("compositeId");

-- CreateIndex
CREATE INDEX "bank_transactions_bankTransactionId_userId_idx" ON "bank_transactions"("bankTransactionId", "userId");

-- CreateIndex
CREATE INDEX "bank_transactions_userId_idx" ON "bank_transactions"("userId");

-- CreateIndex
CREATE INDEX "expense_claims_userId_idx" ON "expense_claims"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_expenseClaimId_userId_key" ON "expense_claims"("expenseClaimId", "userId");

-- CreateIndex
CREATE INDEX "employees_userId_idx" ON "employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeId_userId_key" ON "employees"("employeeId", "userId");

-- CreateIndex
CREATE INDEX "items_userId_idx" ON "items"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "items_itemId_userId_key" ON "items"("itemId", "userId");

-- CreateIndex
CREATE INDEX "purchase_orders_userId_idx" ON "purchase_orders"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_purchaseOrderId_userId_key" ON "purchase_orders"("purchaseOrderId", "userId");

-- CreateIndex
CREATE INDEX "receipts_userId_idx" ON "receipts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receiptId_userId_key" ON "receipts"("receiptId", "userId");

-- CreateIndex
CREATE INDEX "quotes_userId_idx" ON "quotes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteId_userId_key" ON "quotes"("quoteId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_attachmentId_key" ON "attachments"("attachmentId");

-- CreateIndex
CREATE INDEX "attachments_xeroUserId_idx" ON "attachments"("xeroUserId");

-- CreateIndex
CREATE INDEX "attachments_entityType_entityXeroId_idx" ON "attachments"("entityType", "entityXeroId");

-- CreateIndex
CREATE INDEX "journals_userId_idx" ON "journals"("userId");

-- CreateIndex
CREATE INDEX "journals_journalDate_idx" ON "journals"("journalDate");

-- CreateIndex
CREATE INDEX "journals_sourceType_idx" ON "journals"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "journals_journalId_userId_journalNumber_journalDate_key" ON "journals"("journalId", "userId", "journalNumber", "journalDate");

-- CreateIndex
CREATE INDEX "journal_lines_journalId_idx" ON "journal_lines"("journalId");

-- CreateIndex
CREATE INDEX "journal_lines_accountId_idx" ON "journal_lines"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_compositeId_key" ON "budgets"("compositeId");

-- CreateIndex
CREATE INDEX "budgets_budgetId_userId_idx" ON "budgets"("budgetId", "userId");

-- CreateIndex
CREATE INDEX "budgets_userId_idx" ON "budgets"("userId");

-- CreateIndex
CREATE INDEX "balance_sheet_userId_idx" ON "balance_sheet"("userId");

-- CreateIndex
CREATE INDEX "balance_sheet_date_idx" ON "balance_sheet"("date");

-- CreateIndex
CREATE UNIQUE INDEX "balance_sheet_accountType_date_userId_key" ON "balance_sheet"("accountType", "date", "userId");

-- CreateIndex
CREATE INDEX "profit_and_loss_userId_idx" ON "profit_and_loss"("userId");

-- CreateIndex
CREATE INDEX "profit_and_loss_reportDates_idx" ON "profit_and_loss"("reportDates");

-- CreateIndex
CREATE UNIQUE INDEX "profit_and_loss_type_reportDates_userId_key" ON "profit_and_loss"("type", "reportDates", "userId");

-- CreateIndex
CREATE INDEX "trial_balance_userId_idx" ON "trial_balance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "trial_balance_accountId_userId_key" ON "trial_balance"("accountId", "userId");

-- CreateIndex
CREATE INDEX "budget_summary_userId_idx" ON "budget_summary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "budget_summary_account_date_userId_key" ON "budget_summary"("account", "date", "userId");

-- CreateIndex
CREATE INDEX "aged_payables_by_contact_userId_idx" ON "aged_payables_by_contact"("userId");

-- CreateIndex
CREATE INDEX "aged_payables_by_contact_contactId_idx" ON "aged_payables_by_contact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "aged_payables_by_contact_dueDate_userId_name_contactId_invo_key" ON "aged_payables_by_contact"("dueDate", "userId", "name", "contactId", "invoiceId");

-- CreateIndex
CREATE INDEX "aged_receivables_by_contact_userId_idx" ON "aged_receivables_by_contact"("userId");

-- CreateIndex
CREATE INDEX "aged_receivables_by_contact_contactId_idx" ON "aged_receivables_by_contact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "aged_receivables_by_contact_number_invoiceId_key" ON "aged_receivables_by_contact"("number", "invoiceId");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_invoiceCompositeId_fkey" FOREIGN KEY ("invoiceCompositeId") REFERENCES "invoices"("compositeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_creditNoteCompositeId_fkey" FOREIGN KEY ("creditNoteCompositeId") REFERENCES "credit_notes"("compositeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_bankTransactionCompositeId_fkey" FOREIGN KEY ("bankTransactionCompositeId") REFERENCES "bank_transactions"("compositeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_paymentCompositeId_fkey" FOREIGN KEY ("paymentCompositeId") REFERENCES "payments"("compositeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_line_account_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("accountId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_sheet" ADD CONSTRAINT "balance_sheet_account_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("accountId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_and_loss" ADD CONSTRAINT "profit_loss_account_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("accountId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_balance" ADD CONSTRAINT "trial_balance_account_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("accountId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aged_payables_by_contact" ADD CONSTRAINT "aged_payable_contact_fk" FOREIGN KEY ("contactId") REFERENCES "contacts"("contactId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aged_receivables_by_contact" ADD CONSTRAINT "aged_receivable_contact_fk" FOREIGN KEY ("contactId") REFERENCES "contacts"("contactId") ON DELETE RESTRICT ON UPDATE CASCADE;
