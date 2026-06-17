/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { SalesInvoice, CollectionHistory, Customer } from "../types";
import { 
  FileText, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Bookmark, 
  Download, 
  RefreshCw,
  Coins
} from "lucide-react";

interface CompleteLedgerReportProps {
  invoices: SalesInvoice[];
  collections: CollectionHistory[];
  customers: Customer[];
}

export default function CompleteLedgerReport({ invoices, collections, customers }: CompleteLedgerReportProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"All" | "Invoice" | "Receipt">("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Compile a comprehensive double-entry chronological array of all journal records
  const ledgerLines = useMemo(() => {
    const lines: Array<{
      date: string;
      referenceId: string;
      customerCode: string;
      customerName: string;
      type: "Sales Invoice" | "Receipt Payment";
      particulars: string;
      debit: number;  // increases credit balance
      credit: number; // reduces credit balance
      paymentMode?: string;
    }> = [];

    // 1. Process invoices as DEBITS to the B2B account
    invoices.forEach(inv => {
      lines.push({
        date: inv.Date,
        referenceId: `INV-${inv.BillId}`,
        customerCode: inv.CustomerCode,
        customerName: inv.CustomerName,
        type: "Sales Invoice",
        particulars: `Goods sold on ${inv.Route} route [Invoice #${inv.BillId}]`,
        debit: inv.TotalAmount,
        credit: inv.CashReceived + inv.UPIReceived + inv.ChequeReceived, // direct payments reduce balance
        paymentMode: inv.PaymentStatus
      });
    });

    // 2. Process secondary collections as CREDITS to the B2B account
    collections.forEach(col => {
      lines.push({
        date: col.Date,
        referenceId: `RCPT-${col.Id.substring(0, 6).toUpperCase()}`,
        customerCode: col.CustomerCode,
        customerName: col.CustomerName,
        type: "Receipt Payment",
        particulars: `Credit balance collected via ${col.Method} [Ref #${col.BillId}]`,
        debit: 0,
        credit: col.AmountCollected,
        paymentMode: col.Method
      });
    });

    // Sort by date (newest first for general view or oldest first to track progression)
    return lines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, collections]);

  // Apply filters on the ledger
  const filteredLedgerLines = useMemo(() => {
    return ledgerLines.filter(line => {
      // Search query filter (outlet name, code, reference ID)
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        line.customerName.toLowerCase().includes(q) ||
        line.customerCode.toLowerCase().includes(q) ||
        line.referenceId.toLowerCase().includes(q) ||
        line.particulars.toLowerCase().includes(q);

      // Type filter
      const matchType = selectedType === "All" ||
        (selectedType === "Invoice" && line.type === "Sales Invoice") ||
        (selectedType === "Receipt" && line.type === "Receipt Payment");

      // Date range filter
      const matchStart = !startDate || line.date >= startDate;
      const matchEnd = !endDate || line.date <= endDate;

      return matchSearch && matchType && matchStart && matchEnd;
    });
  }, [ledgerLines, searchTerm, selectedType, startDate, endDate]);

  // Aggregate metrics
  const ledgerMetrics = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    filteredLedgerLines.forEach(line => {
      totalDebit += line.debit;
      totalCredit += line.credit;
    });

    return {
      totalDebit,
      totalCredit,
      outstandingNet: totalDebit - totalCredit
    };
  }, [filteredLedgerLines]);

  return (
    <div className="space-y-6 animate-fade-in" id="complete-ledger-report">
      {/* Page Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight font-tech text-amber-glow uppercase flex items-center gap-2">
              <Bookmark className="text-amber-glow animate-pulse" size={22} />
              <span>Complete General Ledger Audit Report</span>
            </h1>
            <p className="text-zinc-400 text-xs mt-1 max-w-3xl font-sans">
              Consolidated distributor trade account statement log. Combines chronological product invoicing debit registers and downstream credit receipts into a unified double-entry ledger sheet.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 uppercase tracking-widest whitespace-nowrap self-start">
            Audit Frame: <span className="text-white font-bold">{filteredLedgerLines.length} Journal Entries</span>
          </span>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Debited Sales */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-amber-glow/20 transition">
          <div className="flex items-center justify-between text-zinc-450 text-[10px] uppercase font-mono tracking-wider">
            <span>Total Account Debits (Gross Sales)</span>
            <div className="p-1 px-2 bg-rose-950/40 text-rose-400 rounded-md border border-rose-900/30 font-bold">
              Dr +
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans text-white">
              ₹{ledgerMetrics.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
            </h3>
            <span className="text-[9px] text-zinc-500 font-mono mt-1 block">Value of all goods dispatched</span>
          </div>
        </div>

        {/* Total Receipts */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-amber-glow/20 transition">
          <div className="flex items-center justify-between text-zinc-450 text-[10px] uppercase font-mono tracking-wider">
            <span>Total Account Credits (Receipts)</span>
            <div className="p-1 px-2 bg-emerald-950/40 text-emerald-400 rounded-md border border-emerald-900/30 font-bold">
              Cr -
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans text-white">
              ₹{ledgerMetrics.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
            </h3>
            <span className="text-[9px] text-zinc-500 font-mono mt-1 block">Cash, UPI & Cheques liquidated</span>
          </div>
        </div>

        {/* Dynamic Outstanding Balance */}
        <div className="bg-zinc-900/60 border border-zinc-805 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-amber-glow/20 transition">
          <div className="flex items-center justify-between text-zinc-450 text-[10px] uppercase font-mono tracking-wider">
            <span>Outstanding Balance</span>
            <Coins size={16} className="text-amber-glow" />
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold font-sans ${ledgerMetrics.outstandingNet > 0 ? "text-amber-glow glow-text-amber" : "text-emerald-400"}`}>
              ₹{ledgerMetrics.outstandingNet.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
            </h3>
            <span className="text-[9px] text-zinc-500 font-mono mt-1 block">Active trade credit in market</span>
          </div>
        </div>
      </div>

      {/* Interactive Controls Panel */}
      <div className="bg-zinc-900 border border-zinc-830 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter ledger by outlet, code, voucher ID..."
            className="w-full bg-zinc-950 text-white font-semibold text-xs py-2 pl-10 pr-4 rounded-xl border border-zinc-800 focus:border-amber-glow focus:ring-0 outline-none transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Toggle */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setSelectedType("All")}
              className={`px-3 py-1 rounded-lg text-[10px] uppercase font-bold transition ${selectedType === "All" ? "bg-amber-glow text-zinc-950 font-bold" : "text-zinc-500 hover:text-white"}`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedType("Invoice")}
              className={`px-3 py-1 rounded-lg text-[10px] uppercase font-bold transition ${selectedType === "Invoice" ? "bg-amber-glow/10 text-amber-glow border border-amber-glow/20" : "text-zinc-500 hover:text-white"}`}
            >
              Debits (Invoices)
            </button>
            <button
              onClick={() => setSelectedType("Receipt")}
              className={`px-3 py-1 rounded-lg text-[10px] uppercase font-bold transition ${selectedType === "Receipt" ? "bg-amber-glow/10 text-amber-glow border border-amber-glow/20" : "text-zinc-500 hover:text-white"}`}
            >
              Credits (Receipts)
            </button>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-1 bg-zinc-950 rounded-xl border border-zinc-850 p-1 text-[10px]">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-zinc-300 font-bold outline-none px-2 py-0.5 border-none"
              title="Start Date"
            />
            <span className="text-zinc-650 font-bold px-1 text-zinc-500">&rarr;</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-zinc-300 font-bold outline-none px-2 py-0.5 border-none"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-rose-400 font-bold px-1.5 hover:text-rose-300 cursor-pointer text-[9px]"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-zinc-900 border border-zinc-850 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[10px] border-collapse">
            <thead>
              <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium uppercase h-9">
                <th className="px-4 py-2 text-zinc-300 h-9 align-middle">Ledger Date</th>
                <th className="px-3 py-2 text-zinc-300 h-9 align-middle">Voucher Ref</th>
                <th className="px-4 py-2 text-zinc-300 h-9 align-middle">Outlet Particulars</th>
                <th className="px-3 py-2 text-zinc-350 h-9 align-middle text-center">Type</th>
                <th className="px-4 py-2 text-right text-rose-400 h-9 align-middle">Debit / Dr (₹)</th>
                <th className="px-4 py-2 text-right text-emerald-400 h-9 align-middle">Credit / Cr (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
              {filteredLedgerLines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 font-semibold italic">
                    No general ledger entries match your criteria. Expand filters to display historical transactions.
                  </td>
                </tr>
              ) : (
                filteredLedgerLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-400 whitespace-nowrap">
                      {new Date(line.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-3 font-bold text-white whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] border ${
                        line.type === "Sales Invoice" ? "bg-zinc-950 border-zinc-800 text-zinc-350" : "bg-amber-glow/5 border-amber-glow/20 text-amber-glow"
                      }`}>
                        {line.referenceId}
                      </span>
                    </td>
                    <td className="px-4 py-3 scrollbar-none">
                      <div className="font-bold text-white uppercase text-xs">{line.customerName}</div>
                      <div className="text-[10px] text-zinc-500 font-normal truncate max-w-[320px]" title={line.particulars}>{line.particulars}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                        line.type === "Sales Invoice" ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                      }`}>
                        {line.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-400 text-xs whitespace-nowrap">
                      {line.debit > 0 ? `₹${line.debit.toLocaleString("en-IN", { minimumFractionDigits: 1 })}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400 text-xs whitespace-nowrap">
                      {line.credit > 0 ? `₹${line.credit.toLocaleString("en-IN", { minimumFractionDigits: 1 })}` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
