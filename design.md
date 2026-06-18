# Swadraj ERP — System Architecture & Design Specification

Swadraj ERP is a custom-coded mobile-responsive Enterprise Resource Planning system tailored for **Swadraj Agencies**, a leading FMCG distribution agency in Pune representing major brands like **Parle Agro** (Frooti, Appy Fizz, Smoodh, Bailley) and **Hindustan Unilever** (ice creams, packaged dairy, food products).

---

## 1. Unified Visual Philosophy
Swadraj ERP uses a custom, eye-safe high-contrast **Industrial Amber Theme** suitable for distributors operating in harsh warehouse and highway field conditions.

*   **Primary Palette:**
    *   **Background:** Deep Obsidian Black (`#07080a`) and Charcoal Slate (`#0b0c10`) representing physical loading docks and metal machinery.
    *   **Accent Glow:** Industrial Amber (`#ffb300` / `rgba(255, 179, 0, 0.15)`) mimicking warning beacons, physical hazard tape, and glowing transport meters.
    *   **UI Status Indicators:** Emerald Spark (`#10b981`) for live sync status and successful payment clearing; Crimson Red (`#ef4444`) for past-due collections and strict phase locks.
*   **Typography Pairings:**
    *   **Headers:** Clean Sans-Serif tracking-tight typography for quick reading under warehouse flickering lights.
    *   **Telemetry & Data Tables:** Sharp Monospaced lettering (`font-mono` / JetBrains Mono) representing computer terminal printers and strict inventory codes.

---

## 2. Master Databases & Schema Contracts

### A. The Three Vehicle Fleet Master (`Vehicle`)
Distributes stock from central warehouses to general trade retail kiosks in custom-assigned territories.
*   **`veh_1` ("Sinhgad"):** Covers Pune city core (Sadashiv Peth, Deccan, Karve Road). (Primary Driver: Ramesh Shinde). Maximum capacity: 150 cases.
*   **`veh_2` ("Rajgad"):** Covers Pimpri Chinchwad, Moshi, and outer industrial lines. (Primary Driver: Sunil Patil). Maximum capacity: 180 cases.
*   **`veh_3` ("Purandar"):** Covers Hadapsar and Saswad countryside loops. (Primary Driver: Sachin Yadav). Maximum capacity: 150 cases.

### B. Warehouse Master Ledger (`Warehouse`)
Tracks physical cases, loose pieces, and separation of fresh vs. returned/expired bottles.
*   **`wh_1` (Main Godown):** Situated at Gate No. 4, Pimpri Chinchwad Industrial Area. Staff assigned: Ramesh Patil. Capacity: 5,000 cases.
*   **`wh_2` (Secondary Space):** Situated at Building B, Moshi Toll Plaza Depots, Pune. Capacity: 2,500 cases.

### C. Promotional Schemes (`Product.Offer_*`)
In FMCG retail, manufacturers push sales volume through buy-get schemas (e.g. buy 10 Frooti cases, get 1 free).
*   **`Offer_Buy_Qty`:** Required case counts to trigger a benefit.
*   **`Offer_Free_Qty`:** Free cases added to delivery sheet automatically by the Billing Engine.
*   **`Offer_Active`:** Flag indicating if scheme applies today.

### D. Supplier Credit Notes (`SupplierCreditNote`)
Secures financial credits from manufacturing plants for defective/expired beverages returned from the market.
*   Tracks item code, reason (expired, leak, damaged), credit value, and application state.

---

## 3. Dedicated User Role Personas
Click the **SYSTEM NODE ACCESS** role switcher in the topmost header bar of the app to change between these interfaces:

### 🖥️ Office Manager / Admin Mode
*   **Responsibilities:** Configures daily product pricing, outlet master rates override, customer list additions, daily sheet rollover, credit term approvals, cash ledger clearance, and employee payroll advances.
*   **Primary Screens:** Operations Desk, Sales Billing Engine, A/R collections, Financial ledgers, Staff Attendance & Payroll, Supplier PO submissions.

### 📦 Warehouse Coordinator Mode
*   **Responsibilities:** Inspects incoming manufacturer delivery trucks, tracks central SKUs stock, prepares physical boxes for loaders, inspects vehicle returned inventory, audits scrap bins, and verifies opening count carryovers.
*   **Primary Screens:** Stock holding catalog, Stock Reconciliation Board, Daily Rollover forms.

### 🚚 Logistics Beat Driver Mode
*   **Responsibilities:** Conducts highway beats, presents carbon copy invoices to shop owners, tallies physical case quantities, accepts cash & UPI collections, logs market complaints (spoiled dairy bottles), and drives vehicles back for physical reconciliation.
*   **Primary Screens:** Active Route Planner, Deliveries checklist, field payments form, field returns logger, load-in summary.

---

## 4. How to Access and View this Document
This design ledger is persisted in `/design.md` at the project root folder.
*   **Option A (Code Editor):** Simply open `/design.md` inside any editor workspace.
*   **Option B (Interactive App UI):** Click the **"📖 Design & Architecture Core"** ledger icon in the header bar of the running application to open a highly responsive, styled modal displaying the rich markdown content instantly!
