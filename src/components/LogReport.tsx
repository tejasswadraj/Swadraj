import React, { useState, useMemo } from "react";
import { 
  Clock, 
  Search, 
  Filter, 
  Database, 
  FileText, 
  ChevronRight, 
  Copy, 
  Check, 
  BookOpen, 
  UserCheck, 
  SlidersHorizontal,
  PlusCircle,
  TrendingDown,
  Trash2,
  AlertCircle
} from "lucide-react";
import { SalesInvoice, PurchaseOrder, Expense, Customer } from "../types";

interface AuditLog {
  Id: string;
  Timestamp: string;
  Category: "Invoice Registry" | "Restocking Purchase" | "Expense Ledger" | "Customer Onboard" | "Markdown Adjustment" | "Fleet Dispatch";
  Title: string;
  UpdatedBy: "Owner" | "Manager" | "Admin" | "Accountant" | "Service Staff";
  ValueImpact: string; // e.g. "+₹14,500" or "-20 cases"
  Status: "Success" | "Pending" | "Flagged";
  MarkdownContent: string;
}

interface LogReportProps {
  invoices: SalesInvoice[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  customers: Customer[];
  activeDateString: string;
}

export default function LogReport({
  invoices,
  purchaseOrders,
  expenses,
  customers,
  activeDateString
}: LogReportProps) {
  // Manual state for logs inputted by users
  const [manualLogs, setManualLogs] = useState<AuditLog[]>([
    {
      Id: "log_init_01",
      Timestamp: "08:15 AM",
      Category: "Markdown Adjustment",
      Title: "Masti Water 500ml - Defective / Damaged Leakage Settlement",
      UpdatedBy: "Service Staff",
      ValueImpact: "-2 Cases (Damaged)",
      Status: "Success",
      MarkdownContent: `# Markdown / Loss Report: SKU Damaged
## Swadraj Agencies Operational Logs

- **SKU Code**: MST-WTR-500
- **Brand**: Masti Mineral Water
- **Adjustment Quant**: 2 Cases (48 Bottles Total)
- **Reported By**: Ramesh Patil (Warehouse Handler)
- **Root Cause**: transit rupture in Sinhgad vehicle delivery load-in

---
### Financial Impact Details:
- **Cost of Purchase**: ₹180 per case
- **Write-off Value**: ₹360 (GST 18% included)
- **Settlement Route**: Logged into Godown loss books`
    },
    {
      Id: "log_init_02",
      Timestamp: "09:30 AM",
      Category: "Markdown Adjustment",
      Title: "Frooti 160ml Tetra Pack Expiry Write-Off",
      UpdatedBy: "Manager",
      ValueImpact: "-5 Cases (Expired)",
      Status: "Success",
      MarkdownContent: `# Expiry Markdown Audit Log
## Warehouse 1 Stock Maintenance

- **SKU Code**: PRLE-FRTI-160T
- **Brand**: Parle Agro (Frooti)
- **Quantity Write-Off**: 5 Cases
- **Auditor Role**: Operations Manager

---
### Verification Notes:
- Standard manufacturer claim lodged for replacement.
- Relocated from active Godown-1 racks to salvage bin.`
    }
  ]);

  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLogId, setSelectedLogId] = useState<string | null>("log_init_01");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form Inputs State for new Log creation
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState<AuditLog["Category"]>("Markdown Adjustment");
  const [formTitle, setFormTitle] = useState("");
  const [formRole, setFormRole] = useState<AuditLog["UpdatedBy"]>("Admin");
  const [formImpact, setFormImpact] = useState("");
  const [formMarkdown, setFormMarkdown] = useState("");

  // Map system entries statically into logs
  const parsedInvoicesLogs = useMemo(() => {
    return invoices.map(inv => {
      // Create markdown description
      const itemDetails = Object.entries(inv.Items)
        .map(([code, qty]) => `- **${code}**: ${qty} Cases (Charged ₹${inv.UnitPrices[code] || 0}/case)`)
        .join("\n");

      const md = `# Sales Invoice Registry Audit
## Invoice Num: inv_${inv.BillId}
### Customer details: ${inv.CustomerName} (${inv.CustomerCode})

- **Bill Date**: ${inv.Date}
- **Route Assigned**: ${inv.Route}
- **Gross Invoice Amount**: ₹${inv.TotalAmount.toLocaleString()}
- **Collection**: Cash ₹${inv.CashReceived} | UPI ₹${inv.UPIReceived} | Cheque ₹${inv.ChequeReceived}
- **Outstanding Outstanding Balance**: ₹${inv.CreditAmount.toLocaleString()}
- **Status of Payment**: ${inv.PaymentStatus}
- **Audit Verification Code**: ${inv.AuditStatus}

---
### Items Transacted:
${itemDetails}

*This log is automatically generated from live billing desk registries.*`;

      return {
        Id: `inv_log_${inv.BillId}`,
        Timestamp: inv.Time || "11:45 AM",
        Category: "Invoice Registry" as const,
        Title: `Sales Invoice generated for ${inv.CustomerName} (Route: ${inv.Route})`,
        UpdatedBy: (inv.Route === "Counter" ? "Accountant" : "Service Staff") as AuditLog["UpdatedBy"],
        ValueImpact: `+₹${inv.TotalAmount.toLocaleString()}`,
        Status: (inv.PaymentStatus === "Paid" ? "Success" : "Pending") as AuditLog["Status"],
        MarkdownContent: md
      };
    });
  }, [invoices]);

  const parsedPurchaseOrdersLogs = useMemo(() => {
    return purchaseOrders.map(po => {
      const itemDetails = po.Items.map(item => 
        `- **${item.Item_Name}**: ${item.Quantity_Cases} Cases @ ₹${item.Purchase_Rate}/case (Tax: ${item.GST_Percent}%)`
      ).join("\n");

      const md = `# Supplier Restocking Purchase Log
## PO Code: ${po.PO_Number}
### Factory Supplier: ${po.Supplier_Name}

- **Log Date**: ${po.Date}
- **Purchase Gross Total**: ₹${po.Grand_Total.toLocaleString()}
- **Status of Intake**: ${po.Status}
- **Expected Arrival**: ${po.Expected_Delivery}
- **DSR Sheet Sync State**: ${po.Sync_To_DSR ? "Integrated to active inventory columns" : "Awaiting validation"}

---
### Purchase Bill Specifications:
${itemDetails}

*This log is automatically synchronized upon purchase order finalization.*`;

      return {
        Id: `po_log_${po.PO_Number}`,
        Timestamp: "03:15 PM",
        Category: "Restocking Purchase" as const,
        Title: `Procured stock replenishment from ${po.Supplier_Name}`,
        UpdatedBy: "Manager" as const,
        ValueImpact: po.Status === "Received" ? `+ ${po.Items.reduce((acc, i) => acc + i.Quantity_Cases, 0)}cs` : `₹${po.Grand_Total.toLocaleString()}`,
        Status: (po.Status === "Received" ? "Success" : "Pending") as AuditLog["Status"],
        MarkdownContent: md
      };
    });
  }, [purchaseOrders]);

  const parsedExpensesLogs = useMemo(() => {
    return expenses.map(exp => {
      const md = `# Fund Disbursement Registry
## Expense Code: ${exp.Id}

- **Voucher Date**: ${exp.Date}
- **Disbursement Category**: ${exp.Category}
- **Amount Deducted**: ₹${exp.Amount.toLocaleString()}
- **Node Applied**: ${exp.VehicleOrLocation || "Counter Office"}
- **Payee name / Details**: ${exp.Description}

---
*Authorized expense entry logged into the ledger safe.*`;

      return {
        Id: `exp_log_${exp.Id}`,
        Timestamp: "05:45 PM",
        Category: "Expense Ledger" as const,
        Title: `Paid ${exp.Category} - '${exp.Description}'`,
        UpdatedBy: "Accountant" as const,
        ValueImpact: `-₹${exp.Amount.toLocaleString()}`,
        Status: "Success" as const,
        MarkdownContent: md
      };
    });
  }, [expenses]);

  const parsedCustomersLogs = useMemo(() => {
    return customers.map(cust => {
      const md = `# Outlet Registration Ledger Card
## Outlet ID: ${cust.Customer_Code}

- **Customer Name**: ${cust.Customer_Name}
- **Assigned Route Beat**: ${cust.Beat}
- **Mobile Contact**: ${cust.Contact || "Not Provided"}
- **Credit Limit Allocation**: ₹${(cust.Credit_Limit || 5000).toLocaleString()}
- **GPS Coordinates**: ${cust.Geolocated_Code || "Coordinates Not Checked"}
- **GST Number**: ${cust.GST_Number || "N/A"}
- **FSSAI Number**: ${cust.FSSAI_Number || "N/A"}
- **Postal Address**: ${cust.Postal_Address || "N/A"}

---
*Verified distribution customer profile archived successfully.*`;

      return {
        Id: `cust_log_${cust.Customer_Code}`,
        Timestamp: "10:10 AM",
        Category: "Customer Onboard" as const,
        Title: `Registered new retail outlet: ${cust.Customer_Name}`,
        UpdatedBy: "Admin" as const,
        ValueImpact: "Active KYC",
        Status: "Success" as const,
        MarkdownContent: md
      };
    });
  }, [customers]);

  // Amalgamate all logs dynamically
  const consolidatedLogs = useMemo(() => {
    const list = [
      ...manualLogs,
      ...parsedInvoicesLogs,
      ...parsedPurchaseOrdersLogs,
      ...parsedExpensesLogs,
      ...parsedCustomersLogs
    ];
    
    // Sort chronologically (assuming newest logs first or reverse ID)
    return list.sort((a, b) => b.Id.localeCompare(a.Id));
  }, [manualLogs, parsedInvoicesLogs, parsedPurchaseOrdersLogs, parsedExpensesLogs, parsedCustomersLogs]);

  // Derived filtered logs
  const filteredLogs = useMemo(() => {
    return consolidatedLogs.filter(log => {
      const matchesSearch = 
        log.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ValueImpact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.MarkdownContent.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = selectedRole === "All" || log.UpdatedBy === selectedRole;
      const matchesCategory = selectedCategory === "All" || log.Category === selectedCategory;

      return matchesSearch && matchesRole && matchesCategory;
    });
  }, [consolidatedLogs, searchQuery, selectedRole, selectedCategory]);

  // Selected Log object
  const activeLog = useMemo(() => {
    return consolidatedLogs.find(l => l.Id === selectedLogId) || filteredLogs[0] || consolidatedLogs[0];
  }, [consolidatedLogs, selectedLogId, filteredLogs]);

  // Handle manual log form submit
  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newLog: AuditLog = {
      Id: "log_man_" + Date.now().toString(),
      Timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      Category: formCategory,
      Title: formTitle,
      UpdatedBy: formRole,
      ValueImpact: formImpact || "N/A",
      Status: "Success",
      MarkdownContent: formMarkdown || `# Operational Markdown Audit Log\n\n- **Title**: ${formTitle}\n- **Impact**: ${formImpact}\n- **Author**: ${formRole}\n\nNo extended details provided.`
    };

    setManualLogs([newLog, ...manualLogs]);
    setSelectedLogId(newLog.Id);
    
    // Reset Form
    setFormTitle("");
    setFormImpact("");
    setFormMarkdown("");
    setShowForm(false);
  };

  const handleCopyMarkdown = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-6 select-none">
      
      {/* Top Banner and Quick statistics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-900 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#ffb300] bg-[#ffb300]/10 border border-[#ffb300]/25 px-2 py-0.5 rounded font-mono font-black text-[10px] tracking-wider uppercase">
              Operational Ledger Auditor
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Real-time Logging Desk</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 uppercase font-sans tracking-tight">
            Comprehensive Operational Log Report
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Dynamic ledger audits capturing and journaling all invoicing, purchases, payroll transfers, and markdown markdown listings.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              setFormMarkdown(`# Markdown Adjustment Register\n## Swadraj Agencies Damage / Salvage Journal \n\n- **SKU & Brand**: \n- **Packaging & Size**: \n- **Total Loss Cases**: \n- **Root Cause**: expired / broke in Warehouse-1`);
            }
          }}
          className="bg-amber-glow hover:bg-amber-600 text-black px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-lg shadow-amber- glow/10"
        >
          <PlusCircle size={14} />
          {showForm ? "Cancel Log Entry" : "Create Markdown / Log"}
        </button>
      </div>

      {/* Manual Markdown Entry Form Drawer/Box */}
      {showForm && (
        <form onSubmit={handleCreateLog} className="bg-gradient-to-tr from-zinc-950 to-[#0e1017] border border-[#ffb300]/20 p-5 rounded-2xl shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
            <span className="text-xs font-black text-amber-glow uppercase font-mono tracking-widest flex items-center gap-2">
              <PlusCircle size={15} /> Create manual operational audit journal
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Operator Audit desk</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-400">Category / Ledger</label>
              <select 
                value={formCategory} 
                onChange={(e) => setFormCategory(e.target.value as AuditLog["Category"])}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white w-full focus:border-amber-glow outline-none"
              >
                <option value="Markdown Adjustment">Markdown Adjustment (Losses)</option>
                <option value="Invoice Registry">Invoice Registry (Sales)</option>
                <option value="Restocking Purchase">Restocking Purchase (Purchase)</option>
                <option value="Expense Ledger">Expense Ledger (Disbursement)</option>
                <option value="Customer Onboard">Customer Onboard (KYC)</option>
                <option value="Fleet Dispatch">Fleet Dispatch (Logistics)</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-400">Log Entry Summary / Title</label>
              <input 
                type="text" 
                placeholder="e.g., Frooti Pet 120ml - transit leakage write off (Rajgad vehicle)"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white w-full focus:border-amber-glow outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-400">Auditor / Author Role</label>
              <select 
                value={formRole} 
                onChange={(e) => setFormRole(e.target.value as AuditLog["UpdatedBy"])}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white w-full focus:border-amber-glow outline-none"
              >
                <option value="Admin">Admin</option>
                <option value="Owner">Owner</option>
                <option value="Manager">Manager</option>
                <option value="Accountant">Accountant</option>
                <option value="Service Staff">Service Staff</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-400">Stock / Value Impact</label>
              <input 
                type="text" 
                placeholder="e.g., -3 Cases (Salvaged)"
                value={formImpact}
                onChange={(e) => setFormImpact(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white w-full focus:border-amber-glow outline-none"
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-400">Formatted Markdown Report Content</label>
              <textarea 
                rows={5}
                required
                placeholder="# Detailed Report title..."
                value={formMarkdown}
                onChange={(e) => setFormMarkdown(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white w-full focus:border-amber-glow outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 px-4 py-2 rounded-xl text-xs font-bold uppercase text-zinc-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase text-black cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck size={14} /> Submit Audit Log Entry
            </button>
          </div>
        </form>
      )}

      {/* Control Filters Toolbar */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col md:flex-row gap-3.5 items-stretch md:items-center">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-550" />
          <input
            type="text"
            placeholder="Search logs by keyword, customer Name, billing totals, SKU, markdown item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-805 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-550 focus:border-amber-600 transition outline-none"
          />
        </div>

        {/* Roles Filter Button */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase font-black text-zinc-500 flex items-center gap-1 shrink-0">
            <UserCheck size={11} /> Updated By:
          </span>
          <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[10px] font-bold">
            {["All", "Owner", "Manager", "Admin", "Accountant", "Service Staff"].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                  selectedRole === role 
                    ? "bg-amber-glow text-black font-black" 
                    : "text-zinc-450 hover:text-white"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase font-black text-zinc-500 flex items-center gap-1 shrink-0">
            <SlidersHorizontal size={11} /> Filter Block:
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-[10px] font-bold text-zinc-350 rounded-lg outline-none focus:border-amber-glow"
          >
            <option value="All">All Operations</option>
            <option value="Markdown Adjustment">Markdown Adjustments</option>
            <option value="Invoice Registry">Invoice Registry</option>
            <option value="Restocking Purchase">Restocking Purchases</option>
            <option value="Expense Ledger">Expense Ledgers</option>
            <option value="Customer Onboard">Customer Registries</option>
          </select>
        </div>
      </div>

      {/* Main split workarea */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side Table Logs list */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex justify-between items-center text-xs font-mono font-bold text-zinc-500 px-1 select-none">
            <span>Journal Timeline ({filteredLogs.length} audit entries found)</span>
            <span>Refreshed Live</span>
          </div>

          <div className="max-h-[640px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-850">
            {filteredLogs.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-10 text-center space-y-2">
                <AlertCircle className="mx-auto text-zinc-650" size={32} />
                <p className="text-zinc-450 text-xs">No ledger entries matched your filter parameters.</p>
                <button 
                  onClick={() => { setSearchQuery(""); setSelectedRole("All"); setSelectedCategory("All"); }}
                  className="bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-mono text-[9px] uppercase font-bold tracking-widest px-2.5 py-1.5 rounded border border-zinc-800"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isActive = log.Id === selectedLogId;
                
                // Color badges per category
                let badgeStyle = "bg-zinc-900 text-zinc-400 border-zinc-800";
                if (log.Category === "Markdown Adjustment") badgeStyle = "bg-rose-500/15 text-rose-400 border-rose-500/20";
                if (log.Category === "Invoice Registry") badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
                if (log.Category === "Restocking Purchase") badgeStyle = "bg-sky-500/15 text-sky-400 border-sky-500/20";
                if (log.Category === "Customer Onboard") badgeStyle = "bg-purple-500/15 text-purple-400 border-purple-500/20";
                if (log.Category === "Expense Ledger") badgeStyle = "bg-amber-500/15 text-amber-400 border-amber-500/20";

                return (
                  <div
                    key={log.Id}
                    onClick={() => setSelectedLogId(log.Id)}
                    className={`border p-3.5 rounded-xl transition cursor-pointer select-none relative group ${
                      isActive 
                        ? "bg-[#0f1118] border-amber-glow/45 scale-[1.005] ring-1 ring-amber-glow/20 shadow-lg glow-subtle" 
                        : "bg-zinc-950 hover:bg-zinc-900/60 border-zinc-900"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      
                      <div className="space-y-1">
                        {/* Time & Category Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badgeStyle}`}>
                            {log.Category}
                          </span>
                          <span className="text-[10px] text-zinc-550 font-mono flex items-center gap-1">
                            <Clock size={10} /> {log.Timestamp}
                          </span>
                          <span className="text-[9.5px] font-semibold text-zinc-450 bg-zinc-900 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                            <UserCheck size={9} /> {log.UpdatedBy}
                          </span>
                        </div>

                        {/* Title details */}
                        <h4 className="text-xs font-bold text-zinc-200 mt-1.5 group-hover:text-white transition">
                          {log.Title}
                        </h4>
                      </div>

                      {/* Cash / Stock Impact Badge */}
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-mono font-black tracking-tight ${
                          log.ValueImpact.startsWith("-") 
                            ? "text-rose-450" 
                            : log.ValueImpact.startsWith("+₹") || log.ValueImpact.startsWith("+")
                            ? "text-emerald-400" 
                            : "text-zinc-300"
                        }`}>
                          {log.ValueImpact}
                        </span>
                        <div className="text-[8px] font-mono text-zinc-550 uppercase font-black tracking-widest mt-0.5 select-none">
                          IMPACT NODE
                        </div>
                      </div>

                    </div>

                    {/* Quick copy indicator */}
                    <ChevronRight size={14} className="absolute right-2 bottom-2 text-zinc-700 font-bold group-hover:text-amber-glow transition" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side Markdown Reader Drawer */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-2xl space-y-4 font-sans select-none self-sticky top-6">
          {activeLog ? (
            <>
              {/* Header with audit copy and meta actions */}
              <div className="flex justify-between items-start pb-3 border-b border-zinc-900">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[9px] font-mono font-extrabold text-zinc-500 uppercase tracking-widest">
                    <BookOpen size={11} className="text-amber-glow" /> Dynamic Markdown Audit Card
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-tight">
                    {activeLog.Category === "Markdown Adjustment" ? "Loss Markdown specification" : "Entry System Manifest"}
                  </h3>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyMarkdown(activeLog.MarkdownContent, activeLog.Id)}
                    className="p-2 bg-zinc-900 hover:bg-zinc-850 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition relative flex items-center gap-1 text-[10px] font-semibold"
                    title="Copy Markdown representation"
                  >
                    {copiedId === activeLog.Id ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Block</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Printable Style Markdown Code block rendering */}
              <div className="bg-[#0c0d12] border border-zinc-900 rounded-xl p-4.5 max-h-[480px] overflow-y-auto text-xs text-zinc-300 leading-relaxed font-mono scrollbar-thin scrollbar-thumb-zinc-850">
                <div className="markdown-body space-y-3.5 pr-2 selection:bg-amber-500/20 text-[11.5px]">
                  
                  {/* Convert simple MD tags manually for native safety & high-fidelity design without react-markdown risks */}
                  {activeLog.MarkdownContent.split("\n").map((line, idx) => {
                    if (line.startsWith("# ")) {
                      return <h2 key={idx} className="text-sm font-black text-[#ffb300] uppercase tracking-wide border-b border-zinc-900 pb-1 mt-3">{line.replace("# ", "")}</h2>;
                    }
                    if (line.startsWith("## ")) {
                      return <h3 key={idx} className="text-xs font-bold text-zinc-200 uppercase tracking-wider mt-2.5">{line.replace("## ", "")}</h3>;
                    }
                    if (line.startsWith("### ")) {
                      return <h4 key={idx} className="text-[11px] font-bold text-zinc-400 font-mono italic">{line.replace("### ", "")}</h4>;
                    }
                    if (line.startsWith("- ")) {
                      // bold text parsing **text**
                      const raw = line.replace("- ", "");
                      const parts = raw.split("**");
                      return (
                        <div key={idx} className="flex items-start gap-1 text-[11px] pl-1">
                          <span className="text-amber-glow mt-0.5 shrink-0">&bull;</span>
                          <span className="text-zinc-350">
                            {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-zinc-200">{p}</strong> : p)}
                          </span>
                        </div>
                      );
                    }
                    if (line.trim() === "---") {
                      return <hr key={idx} className="border-t border-zinc-900 my-3" />;
                    }
                    if (line.trim() === "") {
                      return <p key={idx} className="h-1.5" />;
                    }
                    return (
                      <p key={idx} className="text-zinc-400 pl-0.5">
                        {line.split("**").map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-zinc-200">{p}</strong> : p)}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Metadata Footnote */}
              <div className="bg-zinc-900/40 border border-zinc-900/60 p-3 rounded-xl flex items-start gap-2 text-[10px] text-zinc-450 leading-relaxed font-sans select-none">
                <AlertCircle size={13} className="text-[#ffb300] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-300 uppercase font-mono block text-[9px] tracking-wide mb-0.5">Auditing Compliance Notice</strong>
                  This record manifests real-time distribution operations for the Swadraj Agencies database node, finalized under authority role <strong className="text-zinc-300 font-mono italic">{activeLog.UpdatedBy}</strong> at timestamp <strong className="text-zinc-300 font-mono">{activeLog.Timestamp}</strong>. Any deletion or modification is archived for multi-party confirmation.
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-zinc-650 space-y-2">
              <BookOpen size={36} className="mx-auto" />
              <p className="text-xs">Select any audit block from the timeline ledger queue to populate the detailed printable Markdown manifest tracker.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
