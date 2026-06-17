import React, { useMemo } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  TrendingUp, 
  Truck, 
  Database, 
  PlusCircle, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { DailyServiceSheet, SalesInvoice, PurchaseOrder, Expense } from "../types";

interface DailyWorkFlowChecklistProps {
  sheets: DailyServiceSheet[];
  invoices: SalesInvoice[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  currentPhase: number; // 1, 2, or 3
  activeDateString: string;
}

export default function DailyWorkFlowChecklist({
  sheets,
  invoices,
  purchaseOrders,
  expenses,
  currentPhase,
  activeDateString
}: DailyWorkFlowChecklistProps) {
  // Derive live state properties to auto-complete checklist tasks
  const currentSheet = useMemo(() => {
    if (sheets.length === 0) return null;
    return sheets[sheets.length - 1];
  }, [sheets]);

  const todayInvoices = useMemo(() => {
    return invoices.filter(inv => inv.Date === activeDateString);
  }, [invoices, activeDateString]);

  const hasOpeningCash = useMemo(() => {
    // True if there is cash logged today or there is positive opening cash configured
    return todayInvoices.some(inv => inv.CashReceived > 0) || expenses.length > 0;
  }, [todayInvoices, expenses]);

  const hasNewSalesOrders = useMemo(() => {
    return todayInvoices.length > 0;
  }, [todayInvoices]);

  const hasSupplierPurchases = useMemo(() => {
    return purchaseOrders.some(po => po.Date === activeDateString || po.Status === "Received");
  }, [purchaseOrders, activeDateString]);

  const hasClosingStocks = useMemo(() => {
    // If we have total closing values set in latest sheets
    if (!currentSheet) return false;
    return currentSheet.rows.some(row => row.Total_Closing > 0);
  }, [currentSheet]);

  // Task database matching the user prompt Swadraj flow
  const phases = useMemo(() => [
    {
      id: 1,
      name: "Phase 1: Pre-Market Preparation",
      time: "08:00 AM - 10:00 AM",
      icon: "🌅",
      color: "border-amber-glow/45 bg-amber-glow/5",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      tasks: [
        {
          id: "p1-1",
          title: "Update Opening Cash in Office vault",
          details: "Log starting floats to enable vehicle and counter cash flow.",
          isAuto: hasOpeningCash,
          autoLabel: "Vault Float Active"
        },
        {
          id: "p1-2",
          title: "Audit Previous Day unresolved dispatches",
          details: "Recalculate undelivered, closed, or cancelled outlet bills against truck inventories.",
          isAuto: sheets.length > 1,
          autoLabel: "Audit Complete"
        },
        {
          id: "p1-3",
          title: "Verify New Sales Orders List of outlets",
          details: "Ensure walk-in, outlet, and retail bookings are parsed.",
          isAuto: hasNewSalesOrders,
          autoLabel: "Orders Parsed"
        },
        {
          id: "p1-4",
          title: "Log Opening Stocks in ERP node",
          details: "Verify start stock weights for Warehouse and three vehicles (Sinhgad, Rajgad, Purandar).",
          isAuto: !!currentSheet,
          autoLabel: "DSR Sheet Verified"
        },
        {
          id: "p1-5",
          title: "Dispatch Fleet to Pimpri-Chinchwad area",
          details: "Hand printed invoices to driver & helper staff; execute vehicle launch out.",
          isAuto: todayInvoices.some(inv => inv.Route !== "Counter"),
          autoLabel: "Invoices Handed"
        }
      ]
    },
    {
      id: 2,
      name: "Phase 2: Live Market Execution",
      time: "10:00 AM - 05:00 PM",
      icon: "☀️",
      color: "border-indigo-500/40 bg-indigo-500/5",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      tasks: [
        {
          id: "p2-1",
          title: "Tally Live Receipts entry",
          details: "Submit payments to ledger instantly after on-site deliveries and WhatsApp share.",
          isAuto: todayInvoices.some(inv => inv.PaymentStatus === "Paid" || inv.PaymentStatus === "Partial"),
          autoLabel: "Receipts Posting"
        },
        {
          id: "p2-2",
          title: "Log Spot Sales & Rough Invoices",
          details: "Parse walk-in transactions and direct warehouse cash deliveries.",
          isAuto: todayInvoices.some(inv => inv.Route === "Counter"),
          autoLabel: "Draft Bills Logged"
        },
        {
          id: "p2-3",
          title: "Check Outstanding Ledger constraints",
          details: "Verify credit risk categories of high-ratio retail routes.",
          isAuto: todayInvoices.some(inv => inv.CreditAmount > 0),
          autoLabel: "Credit Aged List Live"
        },
        {
          id: "p2-4",
          title: "Enter Warehouse Supplier Deliveries (POs)",
          details: "Tally incoming water/juice supplies into Godown inventory columns.",
          isAuto: hasSupplierPurchases,
          autoLabel: "Supplier PO Updated"
        }
      ]
    },
    {
      id: 3,
      name: "Phase 3: Evening Reconciliation",
      time: "05:00 PM - 08:00 PM",
      icon: "🌌",
      color: "border-emerald-500/40 bg-emerald-500/5",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      tasks: [
        {
          id: "p3-1",
          title: "Collect Physical Cash & Cheques",
          details: "Retrieve collections report from Sinhgad, Rajgad & Purandar service staff.",
          isAuto: todayInvoices.reduce((sum, inv) => sum + inv.CashReceived + inv.ChequeReceived, 0) > 0,
          autoLabel: "Collections Deposited"
        },
        {
          id: "p3-2",
          title: "Calculate Daily Sales Report (DSR)",
          details: "Execute final cross-ledger tally for water and Parle products.",
          isAuto: hasClosingStocks,
          autoLabel: "DSR Tally Complete"
        },
        {
          id: "p3-3",
          title: "Post closing stock measurements",
          details: " Tally residual vehicle inventory returns back into Godown-1 or Godown-2.",
          isAuto: hasClosingStocks,
          autoLabel: "Stock Measured"
        },
        {
          id: "p3-4",
          title: "Hand cash collections to Accounts bank deposit",
          details: "Log ending cash drawer levels inside ERP vault.",
          isAuto: expenses.some(e => e.Category === "Employee Wages" || e.Category === "Other Expenses"),
          autoLabel: "Ledger Settlement Complete"
        },
        {
          id: "p3-5",
          title: "Trigger Stock replenishment logic",
          details: "If residual stock is high -> activate buyer sales campaign; If dry -> trigger fresh distributor purchase.",
          isAuto: hasSupplierPurchases,
          autoLabel: "Procurement Automated"
        }
      ]
    }
  ], [sheets, todayInvoices, hasOpeningCash, hasNewSalesOrders, hasSupplierPurchases, hasClosingStocks, currentSheet, expenses]);

  // Calculations for progress
  const progressStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    phases.forEach(p => {
      p.tasks.forEach(t => {
        total++;
        if (t.isAuto) completed++;
      });
    });
    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100)
    };
  }, [phases]);

  return (
    <div className="bg-[#0b0c10] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Checklist Phases Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {phases.map((phase) => {
          const isCurrent = currentPhase === phase.id;
          return (
            <div 
              key={phase.id} 
              className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 ${phase.color} ${
                isCurrent 
                  ? "ring-2 ring-amber-glow/50 shadow-inner scale-[1.01]" 
                  : "opacity-65 hover:opacity-100"
              }`}
            >
              <div className="space-y-3">
                {/* Title & Phase details */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{phase.icon}</span>
                    <div>
                      <h3 className="text-xs font-extrabold text-white uppercase font-sans tracking-tight">
                        {phase.name}
                      </h3>
                      <span className="text-[9px] font-mono text-zinc-500 block">
                        {phase.time}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${phase.badgeColor}`}>
                    {isCurrent ? "Active Slot" : "Locked / Offline"}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="space-y-2 pt-2 border-t border-zinc-900/60">
                  {phase.tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-start gap-2 text-[11px] leading-tight select-none"
                    >
                      {task.isAuto ? (
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle size={13} className="text-zinc-650 shrink-0 mt-0.5" />
                      )}
                      
                      <div className="space-y-0.5">
                        <span className={`font-sans font-medium ${task.isAuto ? "text-zinc-300 line-through decoration-zinc-800" : "text-zinc-400"}`}>
                          {task.title}
                        </span>
                        
                        {/* Auto badges */}
                        {task.isAuto && (
                          <span className="block text-[8px] font-mono text-emerald-500 font-bold tracking-widest uppercase">
                            ✓ {task.autoLabel}
                          </span>
                        )}
                        {!task.isAuto && isCurrent && (
                          <span className="block text-[8px] font-mono text-amber-500 font-semibold uppercase">
                            • Actions Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action hints */}
              <div className="mt-4 pt-3 border-t border-zinc-900/40 text-[9px] font-mono text-zinc-500 flex justify-between items-center text-left">
                {isCurrent ? (
                  <span className="text-amber-glow font-bold flex items-center gap-1">
                    <Clock size={10} /> CURRENT ACTIVE PHASE
                  </span>
                ) : (
                  <span>Locked pending slot</span>
                )}
                <span className="hover:text-white cursor-pointer transition">Guides &bull; Protocols</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
