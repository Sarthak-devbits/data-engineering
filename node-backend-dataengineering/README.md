# node-backend-dataengineering

TypeScript/Node.js data engineering pipeline that syncs all Xero accounting data into a PostgreSQL database using Prisma ORM.

## Architecture

```
Xero API ──► Node.js Sync Pipeline ──► PostgreSQL (via Prisma)
                    │
                    └──► OpenAI GPT-4o (journal contact name extraction)
```

## Project Structure

```
node-backend-dataengineering/
├── prisma/
│   └── schema.prisma          # 21-table PostgreSQL schema
├── src/
│   ├── index.ts               # 🚀 Main entry point (runs all syncs)
│   ├── utils/
│   │   ├── callApi.ts         # Xero API caller with retry + rate-limit handling
│   │   ├── xeroAuth.ts        # Token validation + tenant/user ID extraction
│   │   ├── prismaClient.ts    # Singleton Prisma client
│   │   ├── dateUtils.ts       # Xero /Date()/ format parser + month generators
│   │   ├── logger.ts          # Winston logger
│   │   └── openaiClient.ts    # GPT-4o name extraction (journals only)
│   ├── accounting/
│   │   ├── accounts.ts        # GET /Accounts
│   │   ├── contacts.ts        # GET /Contacts
│   │   ├── invoices.ts        # GET /Invoices (paginated)
│   │   ├── creditNotes.ts     # GET /CreditNotes (paginated)
│   │   ├── payments.ts        # GET /Payments
│   │   ├── bankTransactions.ts# GET /BankTransactions
│   │   ├── expenseClaims.ts   # GET /ExpenseClaims
│   │   ├── employees.ts       # GET /Employee
│   │   ├── items.ts           # GET /Items
│   │   ├── purchaseOrders.ts  # GET /PurchaseOrders
│   │   ├── receipts.ts        # GET /Receipts
│   │   ├── quotes.ts          # GET /Quotes
│   │   ├── budgets.ts         # GET /Budgets
│   │   ├── journals.ts        # GET /Journals (offset paginated + source resolution)
│   │   └── attachments.ts     # GET /{Entity}/{id}/Attachments
│   └── reports/
│       ├── balanceSheet.ts    # GET /Reports/BalanceSheet (12 months)
│       ├── profitAndLoss.ts   # GET /Reports/ProfitAndLoss (month by month)
│       ├── trialBalance.ts    # GET /Reports/TrialBalance (12 months)
│       ├── budgetSummary.ts   # GET /Reports/BudgetSummary
│       ├── agedPayablesByContact.ts    # Reports/AgedPayablesByContact per contact
│       └── agedReceivablesByContact.ts # Reports/AgedReceivablesByContact per contact
├── .env.example
├── package.json
└── tsconfig.json
```

## Setup

### 1. Install Dependencies

```bash
cd node-backend-dataengineering
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Fill in your values:
# DATABASE_URL, XERO_ACCESS_TOKEN, OPENAI_API_KEY, APP_USER_ID
```

### 3. Set Up Database

```bash
# Create the PostgreSQL database first, then run migrations
npx prisma migrate dev --name init

# Verify schema was created
npx prisma studio
```

### 4. Run the Sync

```bash
# Development (ts-node)
npm run dev

# Or production (compile first)
npm run build
npm start
```

## Environment Variables

| Variable             | Required | Description                                     |
| -------------------- | -------- | ----------------------------------------------- |
| `DATABASE_URL`       | ✅       | PostgreSQL connection string                    |
| `XERO_ACCESS_TOKEN`  | ✅       | Xero OAuth 2.0 bearer token                     |
| `XERO_BASE_URL`      | ❌       | Defaults to `https://api.xero.com/api.xro/2.0/` |
| `APP_USER_ID`        | ✅       | Internal user ID to scope data (e.g. `1`)       |
| `OPENAI_API_KEY`     | ✅       | OpenAI API key (for journal name extraction)    |
| `OPENAI_API_BASE`    | ❌       | Azure OpenAI base URL (if using Azure)          |
| `OPENAI_API_VERSION` | ❌       | Azure OpenAI API version                        |
| `OPENAI_API_TYPE`    | ❌       | `azure` or `openai` (default: `openai`)         |
| `OPENAI_MODEL`       | ❌       | Model name (default: `gpt-4o`)                  |

## Database Tables (21 total)

| Table                         | Xero Source              |
| ----------------------------- | ------------------------ |
| `accounts`                    | Chart of Accounts        |
| `contacts`                    | Contacts                 |
| `invoices`                    | Invoices                 |
| `credit_notes`                | Credit Notes             |
| `payments`                    | Payments                 |
| `bank_transactions`           | Bank Transactions        |
| `expense_claims`              | Expense Claims           |
| `employees`                   | Employees                |
| `items`                       | Items/Inventory          |
| `purchase_orders`             | Purchase Orders          |
| `receipts`                    | Receipts                 |
| `quotes`                      | Quotes                   |
| `attachments`                 | Attachments (any entity) |
| `budgets`                     | Budgets                  |
| `journals`                    | Journal Entries          |
| `journal_lines`               | Journal Lines            |
| `balance_sheet`               | Balance Sheet Report     |
| `profit_and_loss`             | P&L Report               |
| `trial_balance`               | Trial Balance Report     |
| `budget_summary`              | Budget Summary Report    |
| `aged_payables_by_contact`    | Aged Payables            |
| `aged_receivables_by_contact` | Aged Receivables         |

## Key Design Decisions

- **Upsert pattern**: All modules check `UpdatedDateUTC` before updating — only writes to DB when Xero data has changed
- **Retry logic**: `p-retry` with exponential back-off (up to 10 attempts, max 40s), respects `Retry-After` header on 429s
- **Multi-tenant**: All tables scoped by `userId` and `xeroUserId`
- **Transactions**: Journal + JournalLines inserted in a single Prisma `$transaction`
- **JSONB**: Complex nested fields (lineItems, bankAccount, etc.) stored as PostgreSQL JSONB
