/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from "react";
import { SalesInvoice, Expense, PurchaseOrder, CollectionHistory, Customer } from "../types";
import { PRODUCTS } from "../data/masterData";
import { getCalculatedPrice } from "../utils/math";
import CompleteLedgerReport from "./CompleteLedgerReport";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  DollarSign, 
  Plus, 
  Trash2, 
  FileText, 
  PiggyBank, 
  Eye, 
  X, 
  Calendar, 
  Search, 
  Filter,
  BarChart3,
  TrendingUp as ProfitIcon,
  ShoppingBag,
  IndianRupee,
  Receipt,
  Download,
  Percent,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface FinanceDeskProps {
  invoices: SalesInvoice[];
  expenses: Expense[];
  purchaseOrders: PurchaseOrder[];
  collections: CollectionHistory[];
  customers: Customer[];
  onAddExpense: (exp: Expense) => void;
  onRemoveExpense: (id: string) => void;
  selectedDate: string;
}

export default function FinanceDesk({ 
  invoices, 
  expenses, 
  purchaseOrders = [], 
  collections = [],
  customers = [],
  onAddExpense, 
  onRemoveExpense, 
  selectedDate 
}: FinanceDeskProps) {
  // Treasury sub-navigation state
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "ledger" | "expenses">("dashboard");

  // New Expense Entry Form state
  const [date, setDate] = useState<string>(selectedDate);
  const [category, setCategory] = useState<string>("Employee Wages");
  
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [vehicleLocation, setVehicleLocation] = useState<string>("Counter/Warehouse");
  const [employeeName, setEmployeeName] = useState<string>("");

  // Search and Filter records in Expenses
  const [expenseSearch, setExpenseSearch] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Show "Total Expenses Report" Modal Overlay State
  const [showExpensesModal, setShowExpensesModal] = useState<boolean>(false);

  // Senior Business Analyst GST / Taxation Reconciliation Engine
  const taxMetrics = useMemo(() => {
    let salesTotalTax = 0;
    let salesCgst = 0;
    let salesSgst = 0;
    
    // 1. Output GST on completed sales invoices
    invoices.forEach(inv => {
      Object.entries(inv.Items).forEach(([skuCode, casesQty]) => {
        const prod = PRODUCTS.find(p => p.Item_Code === skuCode);
        if (prod && casesQty > 0) {
          const actualPrice = inv.UnitPrices[skuCode] || getCalculatedPrice(inv.CustomerCode, skuCode);
          const rowTotal = actualPrice * casesQty;
          
          // GST is inclusive in standard pricing
          const basePrice = rowTotal / (1 + prod.GST_Percent / 100);
          const taxVal = rowTotal - basePrice;
          
          salesTotalTax += taxVal;
          salesCgst += taxVal / 2;
          salesSgst += taxVal / 2;
        }
      });
    });

    // 2. Input GST on Goods Received Purchase Orders
    let procurementTotalTax = 0;
    purchaseOrders
      .filter(po => po.Status === "Received")
      .forEach(po => {
        procurementTotalTax += (po.Total_GST || 0);
      });

    const netTaxPayable = salesTotalTax - procurementTotalTax;

    return {
      salesTotalTax,
      salesCgst,
      salesSgst,
      procurementTotalTax,
      netTaxPayable
    };
  }, [invoices, purchaseOrders]);

  // Available categories
  const categoriesList = [
    "Warehouse Rent",
    "Employee Wages",
    "Cost of Electricity",
    "Vehicle Fuel & Maintenance",
    "Extra Expense"
  ];

  // Calculate overall metrics
  const totalSalesRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.TotalAmount, 0);
  }, [invoices]);

  // "Calculate Purchase only after Received Goods"
  const totalPurchaseCost = useMemo(() => {
    return purchaseOrders
      .filter(po => po.Status === "Received")
      .reduce((sum, po) => sum + po.Grand_Total, 0);
  }, [purchaseOrders]);

  const totalExpensesSum = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.Amount, 0);
  }, [expenses]);

  const netOperatingProfit = useMemo(() => {
    return totalSalesRevenue - totalPurchaseCost - totalExpensesSum;
  }, [totalSalesRevenue, totalPurchaseCost, totalExpensesSum]);

  // Category-wise expense breakdown computation
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    categoriesList.forEach(cat => {
      map[cat] = 0;
    });

    expenses.forEach(exp => {
      const cat = exp.Category || "Extra Expense";
      if (map[cat] !== undefined) {
        map[cat] += exp.Amount;
      } else {
        map["Extra Expense"] = (map["Extra Expense"] || 0) + exp.Amount;
      }
    });

    return Object.entries(map).map(([name, val]) => ({
      name,
      amount: val,
      percentage: totalExpensesSum > 0 ? (val / totalExpensesSum) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [expenses, totalExpensesSum]);

  // Handle adding an expense
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    const newExpense: Expense = {
      Id: `exp_${Date.now()}`,
      Date: date,
      Category: category as any,
      Amount: amount,
      Description: description.trim() || `${category} Payout`,
      VehicleOrLocation: vehicleLocation as any,
      EmployeeName: category === "Employee Wages" ? (employeeName.trim() || "Staff") : undefined
    };

    onAddExpense(newExpense);
    setDescription("");
    setAmount(0);
    setEmployeeName("");
    alert("Operational expense added successfully.");
  };

  // Filtered expense list for reports
  const filteredExpensesList = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = 
        exp.Description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (exp.EmployeeName && exp.EmployeeName.toLowerCase().includes(expenseSearch.toLowerCase())) ||
        (exp.VehicleOrLocation && exp.VehicleOrLocation.toLowerCase().includes(expenseSearch.toLowerCase()));
      
      const matchesCategory = categoryFilter === "All" || exp.Category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [expenses, expenseSearch, categoryFilter]);

  return (
    <div className="space-y-6 animate-fade-in font-sans text-zinc-300" id="finance-deck-tab">
      
      {/* Expanded Treasury Heading & Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0d0f13] border border-zinc-800 p-6 rounded-2xl">
        <div>
          <span className="text-[10px] text-amber-glow uppercase tracking-widest font-mono font-bold block">Consolidated Accounts Treasury</span>
          <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">Enterprise Financial & Profitability Cockpit</h1>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
            Consolidated overview of invoice revenue, tax liabilities, procurement cost capital, and real-time operational expenditures.
          </p>
        </div>

        {/* Sub-Navigation Tabs inside Finance */}
        <div className="flex flex-wrap bg-[#07080a] p-1 rounded-xl border border-zinc-800 w-full lg:w-auto">
          <button
            onClick={() => setActiveSubTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex-1 lg:flex-none text-center ${activeSubTab === "dashboard" ? "bg-amber-glow text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}
          >
            Cockpit Analytics
          </button>
          <button
            onClick={() => setActiveSubTab("ledger")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex-1 lg:flex-none text-center ${activeSubTab === "ledger" ? "bg-amber-glow text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}
          >
            General Ledger Audits
          </button>
          <button
            onClick={() => setActiveSubTab("expenses")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex-1 lg:flex-none text-center ${activeSubTab === "expenses" ? "bg-amber-glow text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}
          >
            Operational Outflows
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB SUB-VIEW */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6">
          {/* Reworked Overall Structure Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Sales Revenue card */}
            <div className="bg-[#0e1014] border border-zinc-850 p-5 rounded-xl space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-500">Gross Sales Revenue</span>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">₹{totalSalesRevenue.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
                <span className="text-[10px] text-zinc-500 block mt-1 font-mono">From {invoices.length} Registered Outlets</span>
              </div>
            </div>

            {/* Cost of Procured Capital */}
            <div className="bg-[#0e1014] border border-zinc-850 p-5 rounded-xl space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-500">Procurement Capital</span>
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg">
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">₹{totalPurchaseCost.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
                <span className="text-[10px] text-emerald-400 block mt-1 font-mono">Calculated from Received Goods Only</span>
              </div>
            </div>

            {/* Total Expenses logged */}
            <div className="bg-[#0e1014] border border-zinc-850 p-5 rounded-xl space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-500">Operational Expenses</span>
                <div className="p-2 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg">
                  <Receipt size={16} />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-zinc-100 tracking-tight">₹{totalExpensesSum.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
                <button 
                  onClick={() => setActiveSubTab("expenses")}
                  className="text-[11px] text-amber-glow hover:underline block mt-1 font-mono text-left cursor-pointer font-bold"
                >
                  Analyze {expenses.length} logs &rarr;
                </button>
              </div>
            </div>

            {/* Operating Profitability Margin */}
            <div className="bg-[#0e1014] border border-zinc-850 p-5 rounded-xl space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-500">Primary Operating profit</span>
                <div className={`p-2 rounded-lg border ${netOperatingProfit >= 0 ? "bg-amber-glow/10 border-amber-glow/30 text-amber-glow" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
                  <PiggyBank size={16} />
                </div>
              </div>
              <div>
                <span className={`text-2xl font-bold tracking-tight ${netOperatingProfit >= 0 ? "text-amber-glow" : "text-rose-400"}`}>
                  ₹{netOperatingProfit.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1 font-mono">Gross Revenue minus Purchases & Expenses</span>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Categorical Expense Distribution */}
            <div className="bg-[#0e1014] border border-zinc-850 rounded-2xl p-6 lg:col-span-2 space-y-6">
              <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Categorical Expense Distribution Head</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Distribution and percentage split of active company operating cash outfalls.</p>
                </div>
                <button
                  onClick={() => setActiveSubTab("expenses")}
                  className="px-3 py-1.5 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-amber-glow rounded-lg text-[10px] font-mono tracking-wider uppercase font-bold transition cursor-pointer"
                >
                  Add voucher
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="bg-[#07080a] border border-zinc-900 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-zinc-300 font-mono text-[11px] uppercase truncate max-w-[150px]" title={cat.name}>{cat.name}</span>
                      <span className="font-bold text-white">₹{cat.amount.toLocaleString()}</span>
                    </div>
                    
                    {/* Visual percentage track bar */}
                    <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-amber-glow h-full rounded-full"
                        style={{ width: `${Math.max(1, cat.percentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                      <span>Share of total expenditures:</span>
                      <span>{cat.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Taxation (GST) Settlement Audit */}
            <div className="bg-[#0e1014] border border-zinc-850 rounded-2xl p-6 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/30 font-bold px-2 py-0.5 rounded uppercase font-mono float-right">
                  Reconciled
                </span>
                <h3 className="text-sm font-bold text-amber-glow uppercase tracking-wider font-mono">GST Taxation Audit</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Automated B2B GST Output vs Input Credit reconciliation.</p>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* CGST/SGST collected on Sales */}
                <div className="bg-[#07080a] border border-zinc-900 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                    <span>OUTPUT TRADE GST TAX LIABILITY</span>
                    <strong className="text-zinc-300">₹{taxMetrics.salesTotalTax.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-zinc-850 pt-2 font-mono">
                    <div className="text-zinc-500">
                      CGST (2.5% - 9%): <span className="text-white font-bold block">₹{taxMetrics.salesCgst.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</span>
                    </div>
                    <div className="text-zinc-500">
                      SGST (2.5% - 9%): <span className="text-white font-bold block">₹{taxMetrics.salesSgst.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                </div>

                {/* Input Credit Paid to Wholesalers */}
                <div className="bg-[#07080a] border border-zinc-900 p-3.5 rounded-xl flex justify-between items-center font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">INPUT TAX CREDIT (ITC) CLAIMABLE</span>
                    <span className="text-[9px] text-zinc-650">From received purchase order GST payouts</span>
                  </div>
                  <strong className="text-emerald-400 font-extrabold text-sm">
                    ₹{taxMetrics.procurementTotalTax.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                  </strong>
                </div>

                {/* Net GST Payable */}
                <div className="bg-[#07080a] border border-zinc-900 p-3.5 rounded-xl flex justify-between items-center border-l-2 border-amber-glow">
                  <div>
                    <span className="text-[10px] text-amber-glow uppercase font-bold block">NET GST SETTLEMENT PAYABLE</span>
                    <span className="text-[9px] text-zinc-500">Net Output Liability minus Input Tax Credit</span>
                  </div>
                  <strong className={`font-mono text-sm font-extrabold ${taxMetrics.netTaxPayable >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    ₹{Math.max(0, taxMetrics.netTaxPayable).toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                  </strong>
                </div>

                {/* Note */}
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 flex items-start gap-1.5 text-[9px] text-zinc-500 leading-normal">
                  <AlertTriangle size={12} className="text-amber-glow shrink-0 mt-0.5" />
                  <span>These values are automatically pre-calculated dynamically on standard double-entry sales and incoming procurement receipts inside the Swadraj Agencies database parameters.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* COMPLETE LEDGER DIRECT VIEW TAB */}
      {activeSubTab === "ledger" && (
        <CompleteLedgerReport 
          invoices={invoices} 
          collections={collections} 
          customers={customers} 
        />
      )}

      {/* OPERATIONS / VOUCHERS TAB */}
      {activeSubTab === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side Column: Log Expense Form */}
          <div className="bg-[#0e1014] border border-zinc-850 rounded-2xl p-6 space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-amber-glow uppercase tracking-wider font-mono">Log Operational Payout</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Register a debit on electricity, local wages, transport fuel or rent.</p>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-zinc-500 block mb-1 font-mono uppercase tracking-widest text-[9px] font-bold">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#07080a] text-white rounded-lg border border-zinc-800 p-2.5 outline-none focus:border-amber-glow/40 transition cursor-pointer font-bold text-[11px]"
                >
                  {categoriesList.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1 font-mono uppercase tracking-widest text-[9px] font-bold">Voucher date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#07080a] text-white rounded-lg border border-zinc-800 p-2.5 outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-zinc-500 block mb-1 font-mono uppercase tracking-widest text-[9px] font-bold">Cash Amount (₹)</label>
                  <input
                    type="number"
                    value={amount || ""}
                    onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="₹ Value"
                    className="w-full bg-[#07080a] text-white rounded-lg border border-zinc-800 p-2.5 outline-none font-mono font-bold text-xs"
                    required
                  />
                </div>
              </div>

              {category === "Employee Wages" && (
                <div>
                  <label className="text-zinc-500 block mb-1 font-mono uppercase tracking-widest text-[9px] font-bold">Receiver staff name</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Staff employee name..."
                    className="w-full bg-[#07080a] text-white rounded-lg border border-zinc-805 p-2.5 outline-none placeholder-zinc-700 font-sans text-xs"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-zinc-500 block mb-1 font-mono uppercase tracking-widest text-[9px] font-bold">Vessel / Asset link</label>
                <select
                  value={vehicleLocation}
                  onChange={(e) => setVehicleLocation(e.target.value)}
                  className="w-full bg-[#07080a] text-white rounded-lg border border-zinc-800 p-2.5 outline-none transition cursor-pointer text-[11px]"
                >
                  <option value="Counter/Warehouse">Warehouse Godown</option>
                  <option value="Sinhgad Vehicle">Sinhgad Tour Vehicle (v1)</option>
                  <option value="Purandar Vehicle">Purandar Tour Vehicle (v2)</option>
                  <option value="Rajgad Vehicle">Rajgad Tour Vehicle (v3)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1 font-mono uppercase tracking-widest text-[9px] font-bold">Description Particulars</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Memo details / specific voucher reference details..."
                  className="w-full bg-[#07080a] text-zinc-300 rounded-lg border border-zinc-800 p-2.5 h-20 outline-none resize-none placeholder-zinc-700 font-sans text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-amber-glow font-bold uppercase font-mono tracking-wider rounded-xl transition active:scale-95 cursor-pointer"
              >
                Post Expense Transaction
              </button>
            </form>
          </div>

          {/* Right Side Column: Historical expense listing */}
          <div className="bg-[#0e1014] border border-zinc-850 rounded-2xl p-6 lg:col-span-2 space-y-4">
            <div className="border-b border-zinc-800 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Operating Outflows Register</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Chronological record of company overhead logs.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="Search..."
                  className="bg-[#07080a] border border-zinc-800 rounded-lg pl-3 pr-2.5 py-1 text-[11px] text-white focus:outline-none placeholder-zinc-700 w-full sm:w-32 font-mono"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#07080a] border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none cursor-pointer font-mono"
                >
                  <option value="All">All Heads</option>
                  {categoriesList.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-zinc-850 rounded-xl overflow-hidden bg-[#0d0f13] overflow-y-auto max-h-[500px]">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 font-bold h-9 border-b border-zinc-850 uppercase text-[9px]">
                    <th className="p-3">Date</th>
                    <th className="p-3">Heads</th>
                    <th className="p-3">Memo Detail</th>
                    <th className="p-3 text-right">Debit (₹)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-[10px] text-zinc-300">
                  {filteredExpensesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-555 italic">
                        No operational outflow logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredExpensesList.map((exp, idx) => (
                      <tr key={idx} className="hover:bg-zinc-950/40">
                        <td className="p-3 font-semibold text-zinc-400 font-mono whitespace-nowrap">
                          {exp.Date}
                        </td>
                        <td className="p-3">
                          <span className="bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-350 px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">
                            {exp.Category}
                          </span>
                        </td>
                        <td className="p-3 font-sans">
                          <div className="text-white font-semibold text-xs leading-tight">{exp.Description}</div>
                          {exp.EmployeeName && (
                            <span className="text-[9px] text-amber-glow bg-amber-glow/10 px-1 py-0.1 mt-0.5 inline-block rounded font-mono font-bold">
                              Receiver: {exp.EmployeeName}
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">Location: {exp.VehicleOrLocation}</span>
                        </td>
                        <td className="p-3 text-right font-extrabold text-white text-xs whitespace-nowrap">
                          ₹{exp.Amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`Do you want to delete operational expense payout reference: "${exp.Description}"?`)) {
                                onRemoveExpense(exp.Id);
                              }
                            }}
                            className="text-zinc-650 hover:text-rose-400 transition cursor-pointer p-1"
                            title="Delete Transaction"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* DETAILED TOTAL EXPENSES REPORT MODAL VIEW */}
      {showExpensesModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0f13] border border-zinc-800 w-full max-w-5xl rounded-3xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-805 flex justify-between items-center bg-zinc-950">
              <div>
                <span className="text-[10px] text-[#ffb300] uppercase font-mono font-bold block">Consolidated Operational Expenditures</span>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-amber-glow animate-pulse" />
                  Detailed Total Expenses report
                </h2>
              </div>
              <button
                onClick={() => setShowExpensesModal(false)}
                className="p-2 bg-zinc-900 border border-zinc-800 hover:text-white rounded-xl text-zinc-400 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Filters Section */}
            <div className="p-4 bg-[#0e1014] border-b border-zinc-850 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs font-mono">
              <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
                <span className="text-zinc-500 uppercase font-bold text-[9px]">Query controls</span>
                
                {/* Search text filter */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-600" />
                  <input
                    type="text"
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    placeholder="Search remarks/vehicles..."
                    className="bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-white focus:outline-none placeholder-zinc-700 w-44"
                  />
                </div>

                {/* Dropdown category filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {categoriesList.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="text-right text-zinc-400">
                <span className="uppercase text-[9px] text-zinc-500 font-bold block">Aggregated Filter Sum</span>
                <span className="text-sm font-extrabold text-white">
                  ₹{filteredExpensesList.reduce((sum, exp) => sum + exp.Amount, 0).toLocaleString()}
                </span>
                <span className="text-[9px] text-zinc-500 block">({filteredExpensesList.length} expense rows matched)</span>
              </div>
            </div>

            {/* Modal Body: Expense ledger records list */}
            <div className="p-6 overflow-y-auto flex-1 bg-[#07080a]">
              <div className="border border-zinc-850 rounded-2xl overflow-hidden bg-[#0d0f13]">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-400 font-bold h-10 border-b border-zinc-850 uppercase text-[10px]">
                      <th className="p-3">Reference Date</th>
                      <th className="p-3">Category Head</th>
                      <th className="p-3 text-left">Remark Particulars</th>
                      <th className="p-3">Vessel Location</th>
                      <th className="p-3 text-right text-rose-455">Amount (₹)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 text-[11px] text-zinc-300">
                    {filteredExpensesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-550 italic">
                          No expense records matched the current ledger query filters.
                        </td>
                      </tr>
                    ) : (
                      filteredExpensesList.map((exp, idx) => (
                        <tr key={idx} className="hover:bg-zinc-950/40">
                          <td className="p-3 font-semibold whitespace-nowrap text-zinc-400">
                            <Calendar size={11} className="inline mr-1 text-zinc-600" />
                            {exp.Date}
                          </td>
                          <td className="p-3">
                            <span className="bg-zinc-900 border border-zinc-800 text-zinc-350 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {exp.Category}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-xs">
                            <span className="text-white font-semibold">{exp.Description}</span>
                            {exp.EmployeeName && (
                              <span className="text-[10px] text-[#ffb300] bg-[#ffb300]/10 px-1.5 py-0.2 ml-1.5 rounded font-mono font-bold">
                                Receiver: {exp.EmployeeName}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-zinc-400 font-sans">{exp.VehicleOrLocation}</td>
                          <td className="p-3 text-right font-extrabold text-white text-xs">
                            ₹{exp.Amount.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                if (confirm(`Are you absolutely sure you want to delete this operational expense payout?`)) {
                                  onRemoveExpense(exp.Id);
                                }
                              }}
                              className="text-zinc-600 hover:text-rose-400 transition cursor-pointer p-1 rounded-md"
                              title="Delete Transaction"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-850 text-right">
              <button
                onClick={() => setShowExpensesModal(false)}
                className="px-5 py-2 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-mono uppercase text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Close Report Log
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
