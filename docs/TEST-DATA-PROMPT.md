# ChatGPT Prompt — Generate Full Test Data for Inventory Pro

Copy everything inside the box below into ChatGPT. It will produce realistic, internally-consistent data you can type into every module when you create a new test company.

---

You are a data generator for an ERP / Inventory / POS web application called **Inventory Pro**. I am creating a brand-new test company and need realistic, internally-consistent seed data to manually enter and test **every module**. Generate the data exactly to the specs below.

## Business scenario
- **Company:** "Horizon Electronics" — a mid-size consumer-electronics and home-appliances retailer & wholesaler.
- **Location/context:** Mogadishu, Somalia. Currency **USD**. Timezone **Africa/Mogadishu**. Default tax rate **0%** (Somalia has no VAT on most retail).
- **Staff & customer names:** use realistic Somali names (e.g., Abdiweli, Fatima, Mohamed, Amina, Yusuf, Hodan, Ahmed, Khadija, Omar, Sagal).
- **Products:** real-world electronics brands (Samsung, Oraimo, TP-Link, Philips, HP, Anker, Hisense, Nokia, JBL, Xiaomi) with believable models and prices.

## Output rules
1. Output **one clearly-labeled section per module**, in the exact order listed below.
2. Use **Markdown tables** with the **exact column names** I give for each module.
3. Keep everything **cross-consistent**: sales must reference products that exist; purchases must reference suppliers and products that exist; payroll must reference employees that exist; etc.
4. Use realistic numbers (prices, quantities, salaries). Prices in USD with 2 decimals.
5. Do **not** invent extra columns. Do **not** add commentary inside the tables.
6. After each table, add nothing but the next section header.

---

## 1. Company Profile (1 record)
Table columns: `Field | Value`
Rows: Company name, Legal name, Tagline (short slogan), Industry, Email, Phone, Website, Tax ID, Registration number, Address line 1, City, State/Region, Postal code, Country, Currency (USD), Timezone, Default tax rate (0).

## 2. Warehouses / Branches (3 records)
Columns: `Name | Location (city/area) | Primary? (yes/no)`
One primary main store + 2 branches.

## 3. Team Users (7 records — for Roles & Permissions)
Columns: `Full Name | Email | Primary Role | Extra Roles | Temp Password`
- Roles allowed (use these exact values): `owner, admin, manager, staff, cashier, accountant`.
- Exactly one `owner`. Include at least one person with an **extra role** (e.g. primary `manager` + extra `accountant`).
- Passwords: simple 8-char test passwords.

## 4. Categories (6 records)
Columns: `Category Name | Description`
e.g., Mobile Phones, Computer & Accessories, Home Appliances, Household & Electrical, Networking Equipment, Audio.

## 5. Brands (8 records)
Columns: `Brand Name | Country of Origin`

## 6. Units of Measure (5 records)
Columns: `Unit Name | Abbreviation`
e.g., Piece/pc, Box/box, Pack/pack, Carton/ctn, Set/set.

## 7. Suppliers (6 records)
Columns: `Supplier Name | Contact Person | Email | Phone | Address | Payment Terms`

## 8. Products (25 records)
Columns: `Name | SKU | Barcode (EAN-13) | Category | Brand | Unit | Cost Price | Retail Price | Min Price | Max Price | Min Stock | Reorder Point | Opening Stock`
- SKU format: `BRAND-TYPE-###` (e.g., `SAMSUNG-PHONE-001`).
- **Min Price** = a sensible POS floor (a little above cost); **Max Price** = a ceiling above retail. These bound haggling at the register.
- Opening Stock = a realistic on-hand quantity (5–200).
- Spread products across all 6 categories.

## 9. Customers (12 records)
Columns: `Name | Email | Phone | Segment | Loyalty Points | Credit Limit`
- Segment values: `retail, wholesale, vip`.
- Mix of individuals and business/wholesale buyers.

## 10. Payment Accounts (4 records)
Columns: `Account Name | Type | Opening Balance`
- Type values: `bank, mobile, cash`.
- Use real local names: **Premier Bank** (bank), **Dahabshiil** (bank), **EVC Plus** (mobile), **Dahab / eDahab** (mobile). Opening balances in USD.

## 11. Purchase Orders (6 records)
Columns: `PO Number | Supplier | Product | Quantity | Unit Cost | Status | Expected Date`
- PO Number format `PO-1001`, `PO-1002`…
- Status values: `draft, ordered, partial, received`.
- Reference suppliers and products from sections 7 & 8. Multiple lines per PO are fine (repeat the PO Number across rows).

## 12. POS / Sales Orders (10 records)
Columns: `Order Ref | Customer (or Walk-in) | Product | Quantity | Unit Price | Payment (account or Due) | Status`
- Order Ref format `ORD-2001`…
- Payment: either one of the payment accounts (paid) or `Due` (unpaid, to be settled later).
- Unit Price should be within each product's Min–Max band from section 8.
- Include at least 2 **Due** (pending) orders so I can test editing/settling them.

## 13. Finance — Manual Transactions (8 records)
Columns: `Type | Category | Amount | Account | Date | Description`
- Type values: `income, expense`.
- Income examples: capital injection, service income, interest. Expense examples: rent, utilities, marketing, transport.
- Account = one of the 4 payment accounts (so it shows in Cash & Bank balances).

## 14. Expenses / Vendor Bills (6 records)
Columns: `Expense # | Vendor/Payee | Category | Amount | Tax | Status | Date`
- Category examples: Rent, Utilities, Salaries, Office Supplies, Transport, Marketing.
- Status values: `draft, approved, paid`.

## 15. Recurring Expenses (3 records)
Columns: `Name | Category | Amount | Frequency | Next Due Date`
- Frequency values: `monthly, quarterly`. e.g., Shop Rent, Internet, Generator Fuel.

## 16. HR — Departments (4 records)
Columns: `Department Name | Description`
e.g., Sales, Warehouse, Finance, Administration.

## 17. HR — Positions (5 records)
Columns: `Position Title | Department`

## 18. HR — Employees (8 records)
Columns: `Full Name | Department | Position | Hire Date | Base Salary (monthly USD) | Status`
- Status values: `active`. Reference departments & positions from 16 & 17. Use Somali names.

## 19. HR — Leave Requests (4 records)
Columns: `Employee | Leave Type | Start Date | End Date | Status`
- Leave Type: `annual, sick, unpaid`. Status: `pending, approved`.

## 20. HR — Attendance (6 records)
Columns: `Employee | Date | Status | Hours`
- Status: `present, absent, late`.

## 21. Payroll — Salary Components (5 records)
Columns: `Component Name | Type | Amount or % | Applies To`
- Type values: `earning, deduction` (e.g., Basic Salary, Housing Allowance, Transport Allowance, Loan Deduction, Advance Deduction).

## 22. Payroll — Employee Advances (3 records)
Columns: `Employee | Amount | Date | Months to Repay`
- Reference employees from section 18.

## 23. Payroll — Pay Run Adjustments (4 records — one-off bonuses/deductions)
Columns: `Employee | Label | Type | Amount`
- Type values: `earning` (bonus/overtime) or `deduction`. e.g., "Eid Bonus", "Overtime", "Late penalty".

## 24. Fixed Assets (5 records)
Columns: `Asset Name | Category | Purchase Cost | Purchase Date | Useful Life (years) | Salvage Value`
e.g., Delivery Van, Shop Fittings, Computers, Generator, CCTV System.

## 25. Budgets (1 budget + 6 lines)
First a header row: `Budget Name | Period (e.g. FY2026) | Total`.
Then a lines table: `Account/Category | Budgeted Amount`
- Categories: Sales Revenue, Rent, Salaries, Utilities, Marketing, Cost of Goods Sold.

---

## Final instruction
Generate ALL 25 sections now, fully populated, consistent, and ready for me to type into the app. Do not skip any section. Do not ask clarifying questions — make reasonable assumptions and proceed.

---

### Notes for you (the app owner — not part of the prompt)
- You do **not** need test data for the **Chart of Accounts, Journal, General Ledger, Trial Balance, or Balance Sheet** — the app **auto-creates** the chart of accounts and **auto-posts** journal entries whenever you record sales, purchases, expenses, and payroll. Just enter sections 1–25 and the accounting fills itself.
- Enter data in roughly the listed order (company → warehouses → users → categories/brands/units → products → suppliers/customers → then transactions), because later modules reference earlier ones.
- If ChatGPT's output is too long and gets cut off, ask it: *"continue from section N"*.
