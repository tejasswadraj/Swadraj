/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { SalesInvoice, CollectionHistory } from "../types";
import { calculateCreditRisk } from "../utils/math";
import { 
  Plus, 
  Search, 
  User, 
  Briefcase, 
  Clock, 
  CreditCard, 
  ShieldAlert, 
  DollarSign, 
  ChevronRight,
  Printer,
  Calendar
} from "lucide-react";

interface ARCollectionsProps {
  invoices: SalesInvoice[];
  collections: CollectionHistory[];
  onAddCollection: (invoiceId: number, colAmount: number, method: "Cash" | "UPI" | "Cheque") => void;
  selectedDate: string;
}

export default function ARCollections({ 
  invoices, 
  collections, 
  onAddCollection, 
  selectedDate 
}: ARCollectionsProps) {
  // Collection list state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"pending" | "history" | "master_ledger">("pending");
  const [showClearedCredits, setShowClearedCredits] = useState<boolean>(false);
  const [selectedOutletReport, setSelectedOutletReport] = useState<string | null>(null);

  // Record collection dialog state
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [collectionAmount, setCollectionAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Cheque">("UPI");

  // Outstanding accounts list with aging formulas
  const pendingInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        if (showClearedCredits) {
          // Show both outstanding credit and cleared/paid credit invoices
          return inv.CreditAmount >= 0;
        } else {
          // Default: only active outstanding balances
          return inv.CreditAmount > 0;
        }
      })
      .map(inv => {
        // Calculate aging days based on serial date representation relative to June 14, 2026
        const invoiceDate = new Date(inv.Date);
        const todayDate = new Date("2026-06-14");
        const diffTime = todayDate.getTime() - invoiceDate.getTime();
        const agingDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        return {
          invoice: inv,
          agingDays,
          status: inv.CreditAmount === 0 ? "✅ Cleared / Paid" : calculateCreditRisk(inv.CreditAmount, agingDays)
        };
      })
      .filter(item => 
        item.invoice.CustomerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.invoice.CustomerCode.includes(searchQuery)
      )
      .sort((a, b) => b.agingDays - a.agingDays); // oldest first
  }, [invoices, searchQuery, showClearedCredits]);

  const handleOpenCollector = (invoice: SalesInvoice) => {
    setSelectedInvoice(invoice);
    setCollectionAmount(invoice.CreditAmount); // default to full due amount
  };

  const handleCollect = () => {
    if (!selectedInvoice) return;
    if (collectionAmount <= 0) {
      alert("Please enter a valid amount collected.");
      return;
    }
    if (collectionAmount > selectedInvoice.CreditAmount) {
      alert("Collection amount cannot exceed the invoice Credit Amount due.");
      return;
    }

    onAddCollection(selectedInvoice.BillId, collectionAmount, paymentMethod);
    setSelectedInvoice(null);
    alert(`Collection of ₹${collectionAmount.toLocaleString("en-IN")} logged successfully against Invoice #${selectedInvoice.BillId}!`);
  };

  const totals = useMemo(() => {
    let totalOutstanding = 0;
    let highRiskCount = 0;
    let overLimitCount = 0;

    invoices.forEach(inv => {
      totalOutstanding += inv.CreditAmount;
    });

    pendingInvoices.forEach(p => {
      if (p.status === "🚨 High Credit Risk") highRiskCount++;
      if (p.status === "⚠️ Over Credit Limit") overLimitCount++;
    });

    return {
      totalOutstanding,
      highRiskCount,
      overLimitCount
    };
  }, [invoices, pendingInvoices]);

  return (
    <div className="space-y-6" id="ar-tab">
      {/* KPI Receivables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outstanding */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Total Accounts Receivable (₹)</span>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-rose-400">
              ₹{totals.totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
            </h3>
            <p className="text-zinc-500 text-[10px] mt-1">
              Accumulated outstanding credit portfolio value
            </p>
          </div>
        </div>

        {/* High Risk Aging */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-zinc-400 font-semibold text-xs uppercase tracking-wider text-rose-400">🚨 Critical High Risk Outlets</span>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold font-sans ${totals.highRiskCount > 0 ? "text-rose-400" : "text-zinc-300"}`}>
              {totals.highRiskCount} Outlets
            </h3>
            <p className="text-zinc-500 text-[10px] mt-1">
              Balances older than 45 days credit line limit
            </p>
          </div>
        </div>

        {/* Over Credit Risk Limits */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-zinc-400 font-semibold text-xs uppercase tracking-wider text-amber-glow">⚠️ Limit Exceptions Count</span>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100 font-sans">
              {totals.overLimitCount} Invoices
            </h3>
            <p className="text-zinc-500 text-[10px] mt-1">
              Outstanding balances exceeding ₹5,000 parameters
            </p>
          </div>
        </div>
      </div>

      {/* Selector view and search bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-zinc-900/60 border border-zinc-805 rounded-2xl p-5 shadow-lg">
        <div className="flex border-b border-zinc-800 space-x-6 text-xs shrink-0 overflow-x-auto select-none">
          <button 
            onClick={() => setActiveTab("pending")}
            className={`py-2 px-0.5 border-b-2 font-bold tracking-wide transition cursor-pointer uppercase shrink-0 ${
              activeTab === "pending" ? "border-amber-glow text-amber-glow" : "border-transparent text-zinc-550 hover:text-zinc-300"
            }`}
          >
            Open Credit Accounts ({pendingInvoices.length})
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`py-2 px-0.5 border-b-2 font-bold tracking-wide transition cursor-pointer uppercase shrink-0 ${
              activeTab === "history" ? "border-amber-glow text-amber-glow" : "border-transparent text-zinc-550 hover:text-zinc-300"
            }`}
          >
            Collection History Log ({collections.length})
          </button>
          <button 
            onClick={() => setActiveTab("master_ledger")}
            className={`py-2 px-0.5 border-b-2 font-bold tracking-wide transition cursor-pointer uppercase shrink-0 ${
              activeTab === "master_ledger" ? "border-amber-glow text-amber-glow" : "border-transparent text-zinc-550 hover:text-zinc-300"
            }`}
          >
            📋 Master Accounts General Ledger
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
          {activeTab === "pending" && (
            <label className="flex items-center space-x-2 bg-zinc-950 px-3.5 py-2.5 rounded-xl border border-zinc-850 cursor-pointer select-none text-[11px] text-zinc-400 hover:text-white hover:border-zinc-700 transition">
              <input
                type="checkbox"
                checked={showClearedCredits}
                onChange={(e) => setShowClearedCredits(e.target.checked)}
                className="rounded border-zinc-800 text-amber-glow bg-zinc-950 focus:ring-0 cursor-pointer h-3.5 w-3.5"
              />
              <span className="font-bold tracking-tight">Show Cleared / Paid Bills ({invoices.filter(i => i.CreditAmount === 0).length})</span>
            </label>
          )}

          <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2.5 w-full sm:w-64">
            <Search size={14} className="text-zinc-500" />
            <input
              type="text"
              placeholder="Search customer, beat, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white w-full focus:ring-0 placeholder-zinc-500"
            />
          </div>
        </div>
      </div>

      {activeTab === "pending" && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-semibold tracking-wide font-sans">
                  <th className="px-5 py-3.5 font-normal">Customer Name</th>
                  <th className="px-5 py-3.5 font-normal text-right">Owed Credit (₹)</th>
                  <th className="px-5 py-3.5 font-normal text-center">Date Raised</th>
                  <th className="px-5 py-3.5 font-normal text-center">Credit Aging</th>
                  <th className="px-5 py-3.5 font-normal text-center">Status Flag</th>
                  <th className="px-5 py-3.5 font-normal text-right">Action Interface</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-sans text-zinc-300">
                {pendingInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-zinc-500 font-mono text-xs">
                      No outstanding accounts found. Everybody is fully reconciled!
                    </td>
                  </tr>
                ) : (
                  pendingInvoices.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-950/30 transition">
                      {/* Customer Details */}
                      <td className="px-5 py-4">
                        <span 
                          onClick={() => setSelectedOutletReport(item.invoice.CustomerName)}
                          className="font-bold text-amber-glow hover:underline cursor-pointer block truncate max-w-[180px] select-none"
                          title="Click to view detailed Individual Outlet Credit & Accounts Statement"
                        >
                          {item.invoice.CustomerName} 📊
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                          Bill #{item.invoice.BillId} &bull; Beat {item.invoice.Route} Line
                        </span>
                      </td>

                      {/* Outstanding credit balance */}
                      <td className={`px-5 py-4 text-right font-mono font-bold ${item.invoice.CreditAmount === 0 ? "text-emerald-400" : "text-rose-455"}`}>
                        {item.invoice.CreditAmount === 0 ? (
                          <span>₹0.00 <span className="text-[9px] text-emerald-500 font-sans block">(Fully Settled)</span></span>
                        ) : (
                          <>
                            ₹{item.invoice.CreditAmount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                            <span className="text-[10px] text-zinc-500 block font-normal font-sans">of ₹{item.invoice.TotalAmount}</span>
                          </>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="px-5 py-4 text-center font-mono text-zinc-400 font-bold">
                        {item.invoice.Date}
                      </td>

                      {/* Credit Aging days */}
                      <td className="px-5 py-4 text-center font-mono text-zinc-300 font-bold animate-pulse">
                        {item.invoice.CreditAmount === 0 ? "-" : `${item.agingDays} days`}
                      </td>

                      {/* Dynamic Credit Risk Status flag */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border ${
                          item.status === "✅ Cleared / Paid" ? "bg-emerald-950/40 border-emerald-900 text-emerald-400" :
                          item.status === "🚨 High Credit Risk" ? "bg-rose-950/40 border-rose-900 text-rose-400" :
                          item.status === "⚠️ Over Credit Limit" ? "bg-amber-950/40 border-amber-900 text-amber-glow" :
                          "bg-zinc-950 border-zinc-800 text-zinc-400"
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Reconcile Action trigger */}
                      <td className="px-5 py-4 text-right">
                        {item.invoice.CreditAmount > 0 ? (
                          <button
                            onClick={() => handleOpenCollector(item.invoice)}
                            className="inline-flex items-center space-x-1 border border-emerald-900/40 hover:border-emerald-500 bg-emerald-950/40 hover:bg-emerald-500 hover:text-zinc-950 text-emerald-450 text-[11px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer font-sans"
                          >
                            <DollarSign size={12} />
                            <span>Record Collection</span>
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-bold border border-emerald-900 bg-emerald-950/30 px-3 py-1 rounded-xl text-[10px] font-sans">
                            Paid & Cleared
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-semibold tracking-wide font-sans">
                  <th className="px-5 py-3.5 font-normal">Date Received</th>
                  <th className="px-5 py-3.5 font-normal">Customer Name</th>
                  <th className="px-5 py-3.5 font-normal">Allocated Bill</th>
                  <th className="px-5 py-3.5 font-normal text-right">Amount Collected</th>
                  <th className="px-5 py-3.5 font-normal text-center">Payment Method</th>
                  <th className="px-5 py-3.5 font-normal">Clerk Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300 font-sans">
                {collections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-zinc-500 font-mono text-xs">
                      No payment sheets recorded yet. Record collection payments above to log history.
                    </td>
                  </tr>
                ) : (
                  collections.slice().reverse().map((col, idx) => (
                    <tr key={idx} className="hover:bg-zinc-950/30 transition">
                      <td className="px-5 py-4 font-mono text-zinc-455">
                        {col.Date}
                      </td>
                      <td className="px-5 py-4 font-bold text-white">
                        {col.CustomerName}
                      </td>
                      <td className="px-5 py-4 font-mono text-zinc-400">
                        Bill #{col.BillId} Reference
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">
                        ₹{col.AmountCollected.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-sans border ${
                          col.Method === "UPI" ? "bg-indigo-950/40 text-indigo-400 border-indigo-900" :
                          col.Method === "Cheque" ? "bg-neutral-950 border-neutral-800 text-neutral-400" :
                          "bg-emerald-950/40 text-emerald-400 border-emerald-990"
                        }`}>
                          {col.Method}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-zinc-450 text-xs italic">
                        {col.Notes || "Standard AR transaction clear"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "master_ledger" && (
        <div className="space-y-6">
          {/* Double-entry bookkeeping aggregate summary deck */}
          {(() => {
            const debits = invoices.reduce((sum, i) => sum + i.TotalAmount, 0);
            const credits = collections.reduce((sum, c) => sum + c.AmountCollected, 0);
            const currentAR = debits - credits;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans block">Aggregate Billed Sales (Debits)</span>
                  <strong className="text-sm font-mono text-white block mt-1">₹{debits.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</strong>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans block">Aggregate Receipts Reconciled (Credits)</span>
                  <strong className="text-sm font-mono text-emerald-400 block mt-1">₹{credits.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</strong>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans block">Ledger Outstanding Balance</span>
                  <strong className="text-sm font-mono text-rose-400 block mt-1">₹{currentAR.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</strong>
                </div>
              </div>
            );
          })()}

          {/* Master General Ledger Table */}
          <div className="bg-zinc-900/40 border border-zinc-805 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-zinc-955 border-b border-zinc-800 text-zinc-400 font-bold uppercase text-[9px] select-none">
                    <th className="px-5 py-3">Trade Date</th>
                    <th className="px-5 py-3">Reference Voucher</th>
                    <th className="px-5 py-3">Account / Counter Party Title</th>
                    <th className="px-5 py-3 text-right text-rose-350">Debit (+)</th>
                    <th className="px-5 py-3 text-right text-emerald-400">Credit (-)</th>
                    <th className="px-5 py-3 text-right text-amber-glow">Outstanding AR Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-350">
                  {(() => {
                    // Generate chronological general ledger
                    const entries: Array<{
                      date: string;
                      ref: string;
                      title: string;
                      type: "Debit" | "Credit";
                      amount: number;
                      method: string;
                    }> = [];

                    // Billed invoices are debits
                    invoices.forEach(inv => {
                      entries.push({
                        date: inv.Date,
                        ref: `SALES-${inv.BillId}`,
                        title: inv.CustomerName,
                        type: "Debit",
                        amount: inv.TotalAmount,
                        method: "Sales Account"
                      });
                    });

                    // Collected payments are credits
                    collections.forEach((col, idx) => {
                      entries.push({
                        date: col.Date,
                        ref: `RECPT-${col.BillId}-${idx}`,
                        title: col.CustomerName,
                        type: "Credit",
                        amount: col.AmountCollected,
                        method: col.Method
                      });
                    });

                    // Sort chronologically (oldest to newest) to calculate running balance correctly
                    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    let runningAR = 0;
                    const ledgerRows = entries.map(ent => {
                      if (ent.type === "Debit") {
                        runningAR += ent.amount;
                      } else {
                        runningAR -= ent.amount;
                      }
                      return {
                        ...ent,
                        runningAR
                      };
                    });

                    // Reverse to show newest transactions first in table and apply search filter
                    const filteredLedger = ledgerRows.filter(row => 
                      row.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      row.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      row.method.toLowerCase().includes(searchQuery.toLowerCase())
                    ).reverse();

                    if (filteredLedger.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-zinc-600 italic">
                            No ledger transactions matched the current audit criteria.
                          </td>
                        </tr>
                      );
                    }

                    return filteredLedger.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-950/40">
                        <td className="px-5 py-3 text-zinc-450">{row.date}</td>
                        <td className="px-5 py-3 font-bold text-white select-all">#{row.ref}</td>
                        <td className="px-5 py-3">
                          <span 
                            onClick={() => setSelectedOutletReport(row.title)}
                            className="font-bold font-sans text-amber-glow hover:underline cursor-pointer uppercase select-none"
                          >
                            {row.title}
                          </span>
                          <span className="text-[9px] text-zinc-550 block font-mono">Offset: {row.method}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-rose-450 font-bold">
                          {row.type === "Debit" ? `₹${row.amount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}` : "-"}
                        </td>
                        <td className="px-5 py-3 text-right text-emerald-400 font-bold">
                          {row.type === "Credit" ? `₹${row.amount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}` : "-"}
                        </td>
                        <td className="px-5 py-3 text-right font-black text-amber-glow">
                          ₹{row.runningAR.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL OUTLET CREDIT REPORT MODAL (Triggers when customer is hovered/clicked) */}
      {selectedOutletReport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs text-white">
          <div className="bg-[#0b0c10] border-2 border-zinc-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
            <div className="bg-zinc-950 p-5 border-b border-zinc-850 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-glow uppercase tracking-wider">📊 Outlet General Credit & Ledger Audit Statement</h3>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Chronological client-level subsidiary accounting log for <strong className="text-white font-serif italic">{selectedOutletReport}</strong>.</p>
              </div>
              <button 
                onClick={() => setSelectedOutletReport(null)}
                className="text-zinc-400 hover:text-white text-lg font-bold p-2 hover:bg-zinc-900 rounded-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Subsidiary accounts statistical card layout */}
              {(() => {
                const customerInvoices = invoices.filter(i => i.CustomerName === selectedOutletReport);
                const customerReceipts = collections.filter(c => c.CustomerName === selectedOutletReport);
                const totalBilled = customerInvoices.reduce((sum, i) => sum + i.TotalAmount, 0);
                const totalCollected = customerReceipts.reduce((sum, c) => sum + c.AmountCollected, 0);
                const activeOutstanding = customerInvoices.reduce((sum, i) => sum + i.CreditAmount, 0);

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[9px] text-zinc-550 block uppercase tracking-wide">Aggregate Invoice Billings</span>
                        <strong className="text-sm block mt-1">₹{totalBilled.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</strong>
                        <span className="text-[9px] text-zinc-500 font-sans mt-0.5 block">{customerInvoices.length} gross invoices issued</span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[9px] text-zinc-550 block uppercase tracking-wide text-emerald-555">reconciled receipts (credit)</span>
                        <strong className="text-sm text-emerald-400 block mt-1">₹{totalCollected.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</strong>
                        <span className="text-[9px] text-zinc-500 font-sans mt-0.5 block">{customerReceipts.length} collection events processed</span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[9px] text-zinc-550 block uppercase tracking-wide text-rose-555">Active Credit Outstanding</span>
                        <strong className="text-sm text-rose-400 block mt-1">₹{activeOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</strong>
                        <span className="text-[9px] text-zinc-500 font-sans mt-0.5 block">Limit Parameter: ₹5,000.0</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-glow border-b border-zinc-850 pb-1 font-sans">
                        Itemized Accounts Receivable Sub-Ledger
                      </h4>
                      <div className="border border-zinc-850 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 text-[9px] uppercase">
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Bill ID</th>
                              <th className="p-2.5">Beat Route</th>
                              <th className="p-2.5 text-right">Invoice Sum</th>
                              <th className="p-2.5 text-right">Credit Allocation</th>
                              <th className="p-2.5 text-right text-rose-450">Active Outstanding</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900 text-zinc-350">
                            {customerInvoices.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-6 text-center text-zinc-600 italic">No ledger activity captured for this account.</td>
                              </tr>
                            ) : (
                              customerInvoices.map((inv, idx) => (
                                <tr key={idx} className="hover:bg-zinc-950/40">
                                  <td className="p-2.5 text-zinc-450">{inv.Date}</td>
                                  <td className="p-2.5 text-white font-bold">#{inv.BillId}</td>
                                  <td className="p-2.5">{inv.Route}</td>
                                  <td className="p-2.5 text-right">₹{inv.TotalAmount.toLocaleString()}</td>
                                  <td className="p-2.5 text-right">
                                    ₹{(inv.CashReceived + inv.UPIReceived + inv.ChequeReceived).toLocaleString()}
                                  </td>
                                  <td className={`p-2.5 text-right font-bold ${inv.CreditAmount === 0 ? "text-emerald-450" : "text-rose-455"}`}>
                                    {inv.CreditAmount === 0 ? "Cleared" : `₹${inv.CreditAmount.toLocaleString()}`}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="bg-zinc-950 p-4 border-t border-zinc-850 text-right">
              <button 
                onClick={() => setSelectedOutletReport(null)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer font-sans"
              >
                Exit Statement View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Collection Modal Dialog overlay */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-150 space-y-5 text-white">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-amber-glow font-sans flex items-center space-x-1.5">
                  <CreditCard size={18} className="text-emerald-400 status-flash" />
                  <span>Log Accounts Receivable Payment</span>
                </h3>
                <p className="text-[11px] text-zinc-450 mt-0.5 font-sans font-medium">Reconciling ledger for Invoice #{selectedInvoice.BillId}</p>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-zinc-400 hover:text-white font-bold text-lg select-pointer cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Info panel */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-300 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Retail Outlet:</span>
                  <strong className="font-bold text-white truncate max-w-[190px]">{selectedInvoice.CustomerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Outstanding Credit:</span>
                  <strong className="font-mono text-rose-400 font-extrabold">₹{selectedInvoice.CreditAmount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</strong>
                </div>
              </div>

              {/* Amount field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 block uppercase font-mono">Payment Received (₹)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none font-bold font-mono">₹</div>
                  <input
                    type="number"
                    max={selectedInvoice.CreditAmount}
                    value={collectionAmount || ""}
                    onChange={(e) => setCollectionAmount(Math.min(selectedInvoice.CreditAmount, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full bg-zinc-950 border border-zinc-750 text-white rounded-xl pl-7 pr-3 py-2.5 font-bold font-mono focus:border-amber-glow focus:ring-0 outline-none"
                    placeholder="Enter amount loaded"
                  />
                </div>
              </div>

              {/* Method choice */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 block uppercase font-mono">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Cash", "UPI", "Cheque"] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-3 border rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                        paymentMethod === m 
                          ? "bg-amber-glow/10 text-amber-glow border-amber-glow font-extrabold" 
                          : "bg-zinc-955 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-4 border-t border-zinc-800 text-xs">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCollect}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-tech uppercase font-bold py-2.5 px-4 rounded-xl transition active:scale-95 cursor-pointer"
              >
                Reconcile Credit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
