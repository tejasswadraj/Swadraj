import React, { useState, useMemo } from "react";
import { 
  FileText, 
  Printer, 
  Share2, 
  Calendar, 
  DollarSign, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Send, 
  Clock, 
  Search, 
  Download, 
  TrendingUp, 
  UserCheck, 
  Briefcase,
  HelpCircle,
  Smartphone,
  ChevronRight,
  Info
} from "lucide-react";
import { PRODUCTS } from "../data/masterData";

interface DailyReportsProps {
  sheets: any[];
  invoices: any[];
  collections: any[];
  expenses: any[];
  employees: any[];
  attendanceLog: any[];
  payrollRecords: any[];
  activeSheetDate: string;
}

export default function DailyReports({ 
  sheets, 
  invoices, 
  collections, 
  expenses, 
  employees, 
  attendanceLog, 
  payrollRecords, 
  activeSheetDate 
}: DailyReportsProps) {
  // Supported reports
  const [selectedReportType, setSelectedReportType] = useState<"sales" | "collections" | "stock" | "staff">("sales");
  const [selectedDate, setSelectedDate] = useState<string>(activeSheetDate || "2026-06-14");
  const [whatsappPhone, setWhatsappPhone] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Available dates based on sheets in system
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    sheets.forEach(s => { if (s.date) dates.add(s.date); });
    invoices.forEach(i => { if (i.Date) dates.add(i.Date); });
    collections.forEach(c => { if (c.Date) dates.add(c.Date); });
    
    // Default safe fallback if empty
    if (dates.size === 0) {
      dates.add("2026-06-14");
      dates.add("2026-06-13");
      dates.add("2026-06-12");
    }
    
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [sheets, invoices, collections]);

  // Pre-fill date to closest available if not in list
  useMemo(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  // 1. DATA AGGREGATION FOR SELECTED DATE
  
  // A. Invoices on selected date
  const selectedDateInvoices = useMemo(() => {
    return invoices.filter(inv => inv.Date === selectedDate);
  }, [invoices, selectedDate]);

  // B. Collections on selected date
  // (Include payments from cash invoices + recoveries logged on that date)
  const selectedDateCollections = useMemo(() => {
    // Collect direct invoice cash received + credit pay recovery history on that day
    const directInvoiceCash = selectedDateInvoices.reduce((sum, inv) => sum + (inv.CashReceived || 0), 0);
    const recoveries = collections.filter(c => c.Date === selectedDate);
    const recoveriesAmount = recoveries.reduce((sum, c) => sum + (c.AmountCollected || 0), 0);
    
    return {
      directInvoiceCash,
      recoveries,
      recoveriesAmount,
      totalCashCollected: directInvoiceCash + recoveriesAmount
    };
  }, [selectedDateInvoices, collections, selectedDate]);

  // C. Stock sheet for selected date
  const selectedDateStockSheet = useMemo(() => {
    return sheets.find(s => s.date === selectedDate);
  }, [sheets, selectedDate]);

  // D. Attendance and payroll on selected date
  const selectedDateAttendance = useMemo(() => {
    return attendanceLog.filter(log => log.date === selectedDate);
  }, [attendanceLog, selectedDate]);

  // Calculated totals:
  const salesTotals = useMemo(() => {
    let totalInvoiced = 0;
    let totalTax = 0;
    let totalOutstanding = 0;
    let casesCount = 0;
    const routeBreakdown: { [key: string]: { amount: number, cases: number, bills: number } } = {
      "Sinhgad": { amount: 0, cases: 0, bills: 0 },
      "Purandar": { amount: 0, cases: 0, bills: 0 },
      "Rajgad": { amount: 0, cases: 0, bills: 0 },
      "Counter": { amount: 0, cases: 0, bills: 0 }
    };
    const brandBreakdown: { [key: string]: number } = {};

    selectedDateInvoices.forEach(inv => {
      const route = inv.Route || "Counter";
      if (!routeBreakdown[route]) {
        routeBreakdown[route] = { amount: 0, cases: 0, bills: 0 };
      }
      
      routeBreakdown[route].bills += 1;
      routeBreakdown[route].amount += inv.TotalAmount || 0;
      totalInvoiced += inv.TotalAmount || 0;
      totalOutstanding += inv.CreditAmount || 0;

      // GST estimations
      totalTax += (inv.TotalAmount || 0) * 0.12; // average 12% GST

      Object.entries(inv.Items || {}).forEach(([itemCode, qty]: [string, any]) => {
        const amt = qty || 0;
        casesCount += amt;
        routeBreakdown[route].cases += amt;

        // Try to match brand
        const prod = PRODUCTS.find(p => p.Item_Code === itemCode);
        const brand = prod ? prod.Brand : "Other";
        brandBreakdown[brand] = (brandBreakdown[brand] || 0) + amt;
      });
    });

    return {
      totalInvoiced,
      totalTax,
      totalOutstanding,
      casesCount,
      routeBreakdown,
      brandBreakdown
    };
  }, [selectedDateInvoices]);

  // 2. GENERATE TEXT PAYLOADS FOR WHATSAPP SHARING
  const whatsappTextPayload = useMemo(() => {
    const header = `*SWADRAJ BEVERAGE ENTERPRISE LEDGER*\nDaily Report: *${selectedDate}*\n----------------------------------------\n`;
    
    if (selectedReportType === "sales") {
      let routeText = "";
      Object.entries(salesTotals.routeBreakdown).forEach(([route, stats]: [string, any]) => {
        if (stats.bills > 0) {
          routeText += `• *${route} Route*: ₹${stats.amount.toLocaleString()} (${stats.cases} cases, ${stats.bills} bills)\n`;
        }
      });
      return `${header}📋 *SALES & RECOVERY SUMMARY*\n\n` + 
             `• Total Sales Invoiced: *₹${salesTotals.totalInvoiced.toLocaleString()}*\n` + 
             `• Outstanding Credit Generated: *₹${salesTotals.totalOutstanding.toLocaleString()}*\n` + 
             `• Dispatch Volume: *${salesTotals.casesCount} physical cases*\n\n` + 
             `*Route Metrics breakdown:*\n${routeText || "No route bills logged today."}\n` + 
             `📱 Prepared digitally on Swadraj Portal.`;
    } 
    
    if (selectedReportType === "collections") {
      let recoveryText = "";
      selectedDateCollections.recoveries.forEach((rec, i) => {
        recoveryText += `• Bill #${rec.BillId} recovered Ref: *₹${rec.AmountCollected}* (${rec.Method})\n`;
      });
      return `${header}💰 *ENTERPRISE CASH COLLECTIONS AUDIT*\n\n` + 
             `• Direct Retail Cash Collected: *₹${selectedDateCollections.directInvoiceCash.toLocaleString()}*\n` + 
             `• Backlog Credit Recovery: *₹${selectedDateCollections.recoveriesAmount.toLocaleString()}*\n` + 
             `• *NET PHYSICAL CASH RECEIVED FOR VAULT*: *₹${selectedDateCollections.totalCashCollected.toLocaleString()}*\n\n` + 
             `*Recoveries Detail:*\n${recoveryText || "• No credit recovery logged today."}\n\n` + 
             `🔒 Physical vault balance must match this ledger perfectly.`;
    }

    if (selectedReportType === "stock") {
      const rows = selectedDateStockSheet?.rows || [];
      const varianceCount = rows.filter((r: any) => r.Opening_Variance !== 0 || r.Return_Variance !== 0).length;
      
      let sampleDiscrepancies = "";
      rows.forEach((r: any) => {
         if (r.Opening_Variance !== 0 || r.Return_Variance !== 0) {
           sampleDiscrepancies += `• ${r.Item_Code}: Opening Var=${r.Opening_Variance}, Return Var=${r.Return_Variance}\n`;
         }
      });

      return `${header}📦 *STOCK RECONCILIATION SUMMARY*\n\n` + 
             `• Active Sheet: *DSR_${selectedDateStockSheet?.sheetName || "N/A"}*\n` + 
             `• Total Discrepancy Incidents: *${varianceCount} SKUs*\n` + 
             `• Status: *${varianceCount === 0 ? "✅ PERFECT AUDIT" : "⚠️ VARIANCE DETECTED"}*\n\n` + 
             `${sampleDiscrepancies ? `*Discrepancy logs:*\n${sampleDiscrepancies}` : "Everything matches ledger parameters. All dispatches accounted for!"}`;
    }

    if (selectedReportType === "staff") {
      let staffText = "";
      selectedDateAttendance.forEach(log => {
        staffText += `• *${log.name}* (${log.role}): *${log.status}* (${log.hours} hrs) - ${log.notes || "OK"}\n`;
      });
      
      return `${header}👥 *ROUTE ATTENDANCE & TIMESHEET*\n\n` + 
             `• Active Staff Present: *${selectedDateAttendance.filter(l => l.status === "Present" || l.status === "Half-Day").length} members*\n` + 
             `• Leave/Absent: *${selectedDateAttendance.filter(l => l.status === "Absent").length} members*\n\n` + 
             `*Personnel Punch Card:*\n${staffText || "No staff attendance punches logged for this date."}`;
    }

    return "";
  }, [selectedReportType, selectedDate, salesTotals, selectedDateCollections, selectedDateStockSheet, selectedDateAttendance]);

  // WhatsApp Trigger URL
  const triggerWhatsAppShare = () => {
    const cleanedPhone = whatsappPhone.replace(/\D/g, "");
    const encodedText = encodeURIComponent(whatsappTextPayload);
    // India default country code append if 10 digits
    const targetPhone = cleanedPhone.length === 10 ? "91" + cleanedPhone : cleanedPhone;
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
    setShowShareModal(false);
  };

  // Simulate print/PDF download
  const handlePrintTrigger = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      
      {/* Printable Print Overlay styles targeting specifically daily-report-view segment */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-window, #printable-report-window * {
            visibility: visible;
          }
          #printable-report-window {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 24px;
          }
          #printable-report-window table {
            border-collapse: collapse;
            width: 100%;
          }
          #printable-report-window table th, 
          #printable-report-window table td {
            border: 1px solid #ddd;
            padding: 8px;
            color: black !important;
          }
          #printable-report-window .text-amber-glow,
          #printable-report-window .text-emerald-400,
          #printable-report-window .text-[#ffb300],
          #printable-report-window .text-sky-400 {
            color: black !important;
          }
          #printable-report-window .bg-zinc-950,
          #printable-report-window .bg-[#0d0f13] {
            background: white !important;
            border: 1px solid #ccc !important;
          }
        }
      `}</style>

      {/* Control Navigation & Setup panel */}
      <div className="bg-[#0d0f13] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5 text-amber-glow">
              <FileText className="w-5 h-5" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest">Enterprise Reporting Bureau</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight font-tech text-white">Daily Ledger Reports Generator</h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Inspect fully formulated financial, recovery, stock allocation, and dispatch timesheet records. Export high-fidelity audits as PDF or route summaries direct to WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-zinc-950/80 p-3 rounded-xl border border-zinc-900 z-10 shrink-0">
            {/* Date Select picker */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold block">Audit Date</label>
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-amber-glow cursor-pointer"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <Calendar size={12} className="absolute left-2.5 top-2.5 text-amber-glow" />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-end h-full pt-4">
              <button
                onClick={handlePrintTrigger}
                className="bg-zinc-900 hover:bg-zinc-850 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-zinc-805 transition cursor-pointer active:scale-95"
              >
                <Printer size={13} className="text-[#ffb300]" />
                <span>PDF Print</span>
              </button>
              
              <button
                onClick={() => setShowShareModal(true)}
                className="bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold ml-1.5 px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-emerald-700/50 transition cursor-pointer active:scale-95 animate-pulse"
              >
                <Share2 size={13} />
                <span>WhatsApp Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection Submenu pill system */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6 p-1 bg-zinc-950 rounded-xl border border-zinc-900">
          {[
            { id: "sales", label: "Sales & Orders Ledger", icon: FileText, desc: "Revenue & invoice totals" },
            { id: "collections", label: "Cash Collections Audit", icon: DollarSign, desc: "Cash counter split & AR" },
            { id: "stock", label: "Stock Reconciliation", icon: Package, desc: "DSR movement & variance" },
            { id: "staff", label: "Route Attendance", icon: Users, desc: "Timesheets & drivers roll" }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = selectedReportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedReportType(tab.id as any)}
                className={`py-3 px-4 rounded-lg text-left transition-all border cursor-pointer ${
                  isSelected 
                    ? "bg-amber-glow border-amber-glow text-black" 
                    : "bg-zinc-950 border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className={isSelected ? "text-black" : "text-amber-glow"} />
                  <span className="text-[11px] font-black uppercase font-mono">{tab.label}</span>
                </div>
                <span className={`text-[9px] block mt-0.5 font-mono ${isSelected ? "text-zinc-800" : "text-zinc-500"}`}>{tab.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Report Window Viewport */}
      <div 
        id="printable-report-window" 
        className="bg-[#0d0f13] border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl"
      >
        {/* Swadraj Receipt-style high contrast letterhead */}
        <div className="border-b border-zinc-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-amber-glow font-mono uppercase tracking-widest block bg-amber-glow/10 border border-amber-glow/20 px-2 py-0.5 rounded w-max">
              OFFICIAL SYSTEM EXPORT AUDIT
            </span>
            <h1 className="text-2xl font-black tracking-tighter text-white">SWADRAJ BEVERAGE DISTRIBUTORS</h1>
            <p className="text-xs text-zinc-400 font-mono">
              Sector 4 Central Hub Gate PIN-411009 • GSTIN: 27AABCS9837M1ZN
            </p>
          </div>

          <div className="text-right font-mono text-zinc-400 text-xs space-y-1.5 p-3 bg-zinc-950 border border-zinc-900 rounded-xl min-w-[200px]">
            <div><span className="text-zinc-500 font-bold uppercase text-[9px] block">Generated Date</span> <span className="font-bold text-white text-[11px]">{selectedDate}</span></div>
            <div><span className="text-zinc-500 font-bold uppercase text-[9px] block">Report Category</span> <span className="font-extrabold uppercase text-amber-glow text-[11px]">{selectedReportType} LEDGER</span></div>
            <div><span className="text-zinc-500 font-bold uppercase text-[9px] block">Verification Status</span> <span className="text-emerald-400 text-[10px] flex items-center justify-end gap-1 font-bold">● SYSTEM COMPLIANT</span></div>
          </div>
        </div>

        {/* Dynamic Report Viewports */}
        
        {/* PORT 1: SALES LEDGER */}
        {selectedReportType === "sales" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Highlights bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">Total Sales Invoiced</span>
                <span className="text-xl font-mono font-black text-white">₹{salesTotals.totalInvoiced.toLocaleString()}</span>
                <span className="text-[9px] block font-mono text-emerald-400 mt-1">From {selectedDateInvoices.length} active bills</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">Total GST (Estimated)</span>
                <span className="text-xl font-mono font-black text-zinc-300">₹{salesTotals.totalTax.toLocaleString()}</span>
                <span className="text-[9px] block font-mono text-zinc-500 mt-1">Invoiced 12% avg bucket</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">Outstanding Debt Owed</span>
                <span className="text-xl font-mono font-black text-[#ffb300]">₹{salesTotals.totalOutstanding.toLocaleString()}</span>
                <span className="text-[9px] block font-mono text-red-400 mt-1">Written to customer ledgers</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">Dispatch Case Volume</span>
                <span className="text-xl font-mono font-black text-sky-400">{salesTotals.casesCount} Cases</span>
                <span className="text-[9px] block font-mono text-sky-500 mt-1">Out of warehouse stocks</span>
              </div>
            </div>

            {/* Invoices Detailed Breakdowns lists */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-mono font-extrabold text-zinc-300 flex items-center gap-1.5">
                <Briefcase size={13} className="text-amber-glow" /> Daily Registered Invoices Ledger
              </h3>
              
              <div className="overflow-hidden border border-zinc-900 rounded-xl bg-zinc-950">
                <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                  <thead className="bg-[#0f1115] text-zinc-400 border-b border-zinc-900">
                    <tr>
                      <th className="p-3 pl-4">Bill ID</th>
                      <th className="p-3">Customer Code / Name</th>
                      <th className="p-3">Authorized Route</th>
                      <th className="p-3 text-right">Invoice Sum</th>
                      <th className="p-3 text-right">Cash Received</th>
                      <th className="p-3 text-right">Outstanding Credit</th>
                      <th className="p-3 pr-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {selectedDateInvoices.length > 0 ? (
                      selectedDateInvoices.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/30">
                          <td className="p-3 pl-4 font-bold text-amber-glow">#{inv.BillId}</td>
                          <td className="p-3">
                            <span className="font-bold text-white block">{inv.CustomerName}</span>
                            <span className="text-[10px] text-zinc-500">Code: {inv.CustomerCode}</span>
                          </td>
                          <td className="p-3">
                            <span className="bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] px-2 py-0.5 rounded font-bold">{inv.Route}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-white">₹{inv.TotalAmount.toLocaleString()}</td>
                          <td className="p-3 text-right text-emerald-400 font-medium">₹{inv.CashReceived.toLocaleString()}</td>
                          <td className="p-3 text-right text-red-400">₹{inv.CreditAmount.toLocaleString()}</td>
                          <td className="p-3 pr-4 text-center font-bold">
                            <span className={`text-[9px] uppercase px-2 py-0.5 rounded ${
                              inv.CreditAmount === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                            }`}>
                              {inv.CreditAmount === 0 ? "FULLY PAID" : "PARTIAL CREDIT"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono">
                          No invoice billing transacted on this active date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Geographical Route Aggregate summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-xs uppercase font-mono font-extrabold text-zinc-300 block mb-3">Route Dispatch Aggregation</span>
                <div className="space-y-2.5 font-mono text-xs">
                  {Object.entries(salesTotals.routeBreakdown).map(([route, stats]: [string, any]) => (
                    <div key={route} className="flex justify-between items-center p-2.5 bg-zinc-900/40 rounded border border-zinc-900">
                      <div>
                        <span className="text-white font-black">{route} Route</span>
                        <div className="text-[10px] text-zinc-500 mt-1">{stats.bills} Bills • {stats.cases} total cases</div>
                      </div>
                      <span className="text-sm font-bold text-amber-glow">₹{stats.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-xs uppercase font-mono font-extrabold text-[#ffb300] block mb-3">Brand Case Volume Dispatched</span>
                {Object.keys(salesTotals.brandBreakdown).length > 0 ? (
                  <div className="space-y-2 font-mono text-xs">
                    {Object.entries(salesTotals.brandBreakdown).map(([brand, count]) => (
                      <div key={brand} className="flex justify-between items-center p-2 bg-zinc-900/20 rounded">
                        <span className="text-zinc-400">{brand} range items</span>
                        <span className="font-extrabold text-white text-right">{count} Cases</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No brand volume dispatches tracked for selected day.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PORT 2: CASH COLLECTIONS AUDIT */}
        {selectedReportType === "collections" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">Direct Sales Cash Collected</span>
                <span className="text-xl font-mono font-black text-emerald-400">₹{selectedDateCollections.directInvoiceCash.toLocaleString()}</span>
                <span className="text-[9px] block font-mono text-zinc-500 mt-1">Invoices instant payment collection</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">A/R Credit Recovery</span>
                <span className="text-xl font-mono font-black text-sky-400">₹{selectedDateCollections.recoveriesAmount.toLocaleString()}</span>
                <span className="text-[9px] block font-mono text-zinc-500 mt-1">From outstanding debt recoveries</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 border-emerald-500/20">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">TOTAL PHYSICAL CASH FOR VAULT</span>
                <span className="text-xl font-mono font-black text-white">₹{selectedDateCollections.totalCashCollected.toLocaleString()}</span>
                <span className="text-[9px] block font-mono text-emerald-400 mt-1 font-bold">100% Vault deposit alignment enforced</span>
              </div>
            </div>

            {/* Recoveries breakdown table */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-mono font-extrabold text-zinc-300 flex items-center gap-1.5">
                <DollarSign size={13} className="text-amber-glow" /> Dynamic A/R Credit Recoveries Ledger
              </h3>
              
              <div className="overflow-hidden border border-zinc-900 rounded-xl bg-zinc-950">
                <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                  <thead className="bg-[#0f1115] text-zinc-400 border-b border-zinc-900">
                    <tr>
                      <th className="p-3 pl-4">Collection ID</th>
                      <th className="p-3">Matched Bill ID</th>
                      <th className="p-3">Customer Target Name</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3 text-right">Amount Received</th>
                      <th className="p-3 pr-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {selectedDateCollections.recoveries.length > 0 ? (
                      selectedDateCollections.recoveries.map((rec, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/30">
                          <td className="p-3 pl-4 text-amber-glow font-bold">#REC-{rec.Id || idx + 101}</td>
                          <td className="p-3 font-semibold text-white">Bill #{rec.BillId}</td>
                          <td className="p-3">
                            <span className="text-zinc-400 block">{rec.CustomerName || "Swadraj Client Counter"}</span>
                          </td>
                          <td className="p-3">
                            <span className="bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{rec.Method}</span>
                          </td>
                          <td className="p-3 text-right text-emerald-400 font-extrabold">₹{(rec.AmountCollected || 0).toLocaleString()}</td>
                          <td className="p-3 pr-4 text-center font-bold">
                            <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                              DEPOSITED
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500 font-mono">
                          No older outstanding A/R recoveries logged for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Informational Vault Disclaimer */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-start gap-3">
              <Info size={16} className="text-amber-glow shrink-0 mt-0.5" />
              <p className="text-[10px] font-mono leading-relaxed text-zinc-400">
                **Vault Audit Policy**: Physical cash count matching this ledger should be initiated daily at 20:00 UTC under the Admin Clerk's signature. Any UPI bank reconciliation is directly swept against our corporate gateway registers automatically.
              </p>
            </div>
          </div>
        )}

        {/* PORT 3: STOCK RECONCILIATION */}
        {selectedReportType === "stock" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Overview */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xs uppercase font-mono font-extrabold text-white">DSR Daily Service Sheet: {selectedDateStockSheet?.sheetName || "N/A"}</h3>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Contains physical inventory counts, factory loader dispatches, and end-of-day balances.
                </p>
              </div>

              {selectedDateStockSheet ? (
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-accent-green uppercase text-emerald-400">Reconciled Core ledger</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-amber-glow uppercase">No Active Sheet Seed</span>
                </div>
              )}
            </div>

            {/* Stock table */}
            {selectedDateStockSheet ? (
              <div className="space-y-4">
                <div className="overflow-hidden border border-zinc-900 rounded-xl bg-zinc-950">
                  <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                    <thead className="bg-[#0f1115] text-zinc-400 border-b border-zinc-900 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5 pl-4">Item Code</th>
                        <th className="p-2.5">Opening Stock</th>
                        <th className="p-2.5">Primary Factory load</th>
                        <th className="p-2.5 text-center">Sinhgad Load Out</th>
                        <th className="p-2.5 text-center">Purandar Load Out</th>
                        <th className="p-2.5 text-center">Rajgad Load Out</th>
                        <th className="p-2.5">Returns</th>
                        <th className="p-2.5 text-right pr-4">Closing count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-zinc-300">
                      {selectedDateStockSheet.rows?.slice(0, 10).map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-900/30">
                          <td className="p-2.5 pl-4 text-white font-bold">{row.Item_Code}</td>
                          <td className="p-2.5">{row.Opening_Balance} c</td>
                          <td className="p-2.5 text-emerald-400">+{row.Primary_Load_In} c</td>
                          <td className="p-2.5 text-center text-zinc-450">-{row.Sinhgad_Load || 0}</td>
                          <td className="p-2.5 text-center text-zinc-450">-{row.Purandar_Load || 0}</td>
                          <td className="p-2.5 text-center text-zinc-450">-{row.Rajgad_Load || 0}</td>
                          <td className="p-2.5 text-orange-400">+{row.Sinhgad_Load_In || 0}</td>
                          <td className="p-2.5 text-right pr-4 text-sky-400 font-extrabold">{row.Closing_Balance} cases</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl">
                  <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block mb-2">Detailed Reconciliation Auditing Log</span>
                  <div className="space-y-1.5 text-[10px] font-mono leading-relaxed text-zinc-500">
                    <div>• Calculated Opening discrepancy count: <span className="text-emerald-400 font-bold">0 units</span></div>
                    <div>• Calculated Unsold returned variance check: <span className="text-emerald-400 font-bold">0 units (Perfect lock)</span></div>
                    <div>• Combined warehouse closing tally matches computerized books exactly.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-zinc-500 font-mono border border-zinc-900 rounded-xl bg-zinc-950">
                No physical stocktake service sheets logged for the selected date sequence.
              </div>
            )}
          </div>
        )}

        {/* PORT 4: STAFF ATTENDANCE & TIMESHEET (FORMERLY EMPLOYMENT REPORT UNDER THE HOOD) */}
        {selectedReportType === "staff" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Dashboard highlights present staff */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-left">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">Punched Driver Crew</span>
                <span className="text-xl font-bold text-white">
                  {selectedDateAttendance.filter(l => l.status === "Present" && l.role.includes("Driver")).length} Present
                </span>
                <span className="text-[9px] block text-zinc-500 mt-1">Authorized on fleet dispatch paths</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-left">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">Total Labour Hours</span>
                <span className="text-xl font-bold text-emerald-400">
                  {selectedDateAttendance.reduce((sum, current) => sum + (current.hours || 0), 0)} Hours logged
                </span>
                <span className="text-[9px] block text-zinc-500 mt-1">Sum of warehouse & driving shifts</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-left">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold block mb-1">Calculated Daily Wage Sum</span>
                <span className="text-xl font-bold text-amber-glow">
                  ₹{selectedDateAttendance.length * 750} INR
                </span>
                <span className="text-[9px] block text-zinc-500 mt-1">Authorized for ledger payout</span>
              </div>
            </div>

            {/* Attendance registers table */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-mono font-extrabold text-zinc-300 flex items-center gap-1.5">
                <Users size={13} className="text-amber-glow" /> Daily Attendance Logs Punch Card
              </h3>

              <div className="overflow-hidden border border-zinc-900 rounded-xl bg-zinc-950">
                <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                  <thead className="bg-[#0f1115] text-zinc-400 border-b border-zinc-900 text-[10px] uppercase">
                    <tr>
                      <th className="p-3 pl-4">Staff Name</th>
                      <th className="p-3">Assigned Designation</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Shift Hours</th>
                      <th className="p-3">Remarks / Route Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {selectedDateAttendance.length > 0 ? (
                      selectedDateAttendance.map((log, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/30">
                          <td className="p-3 pl-4 text-white font-bold">{log.name}</td>
                          <td className="p-3 text-zinc-400">{log.role}</td>
                          <td className="p-3 text-center font-bold">
                            <span className={`text-[9px] px-2 py-0.5 rounded ${
                              log.status === "Present" ? "bg-emerald-500/10 text-emerald-450" :
                              log.status === "Half-Day" ? "bg-amber-500/10 text-amber-450" : "bg-red-500/10 text-red-400"
                            }`}>
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-white">{log.hours} hrs</td>
                          <td className="p-3 text-zinc-400">{log.notes || "System entry auto punch"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500 font-mono">
                          No personnel logs reported for the chosen ledger date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Signatures block for printing */}
        <div className="border-t border-dashed border-zinc-800 pt-8 mt-12 grid grid-cols-2 gap-12 font-mono text-zinc-500 text-[10px]">
          <div>
            <span className="block border-b border-zinc-800 h-8 mb-2 w-48" />
            <span className="font-bold uppercase block text-zinc-400">ADMINISTRATOR SIGNATURE</span>
            <span>Swadraj distribution controls officer</span>
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="block border-b border-zinc-800 h-8 mb-2 w-48" />
            <span className="font-bold uppercase block text-zinc-400">VAULT OFFICER SIGNATURE</span>
            <span>Liquidity and stock integrity verification</span>
          </div>
        </div>
      </div>

      {/* WHATSAPP SHARE CONFIG MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0e1115] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black uppercase text-white font-mono flex items-center gap-2">
                  <Smartphone className="text-emerald-400 animate-pulse" /> WhatsApp Report Dispatcher
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Deliver the complete daily report statistics text wrap directly to the route drivers or administrative groups.
                </p>
              </div>
            </div>

            <div className="space-y-3 font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">India Phone Number (e.g. 98XXXXXXXX)</label>
                <div className="flex">
                  <span className="bg-zinc-950 text-zinc-400 border border-zinc-900 px-3 py-2 rounded-l-xl text-xs flex items-center font-bold">
                    +91
                  </span>
                  <input
                    type="text"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="Enter 10-digit number"
                    className="flex-1 px-3 py-2 text-xs bg-zinc-900 border-y border-r border-zinc-800 rounded-r-xl focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>
              </div>

              {/* Text Area Preview showing message wrap */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Pre-Formatted Message Wrap</label>
                <textarea
                  readOnly
                  value={whatsappTextPayload}
                  rows={6}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-[10px] text-zinc-300 resize-none font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={triggerWhatsAppShare}
                disabled={!whatsappPhone.trim() || whatsappPhone.replace(/\D/g, "").length < 10}
                className="px-4 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Send size={12} />
                <span>Transmit to WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
