/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from "react";
import { SalesInvoice, Product, Expense, DailyServiceSheet, DailyServiceRow } from "../types";
import { PRODUCTS } from "../data/masterData";
import { 
  FileText, 
  TrendingUp, 
  Truck, 
  Calendar, 
  Download, 
  Filter, 
  BadgeAlert, 
  Coins, 
  CheckCircle,
  Hash,
  AlertCircle,
  Wrench,
  User,
  Activity
} from "lucide-react";
import { getSimplifiedProductName } from "./StockReconciliation";

interface ServiceReportProps {
  invoices: SalesInvoice[];
  expenses?: Expense[];
  sheets?: DailyServiceSheet[];
  activeSheetName?: string;
}

export default function ServiceReport({ 
  invoices, 
  expenses = [], 
  sheets = [], 
  activeSheetName 
}: ServiceReportProps) {
  const [selectedRoute, setSelectedRoute] = useState<"Sinhgad" | "Purandar" | "Rajgad">("Sinhgad");
  const [skuSearchQuery, setSkuSearchQuery] = useState("");
  
  // Choose standard date bounds for reporting
  const [startDate, setStartDate] = useState<string>("2026-06-13");
  const [endDate, setEndDate] = useState<string>("2026-06-14");

  // Identify active DSR sheet to calculate physical Load In & Load Out cases for the vehicle
  const currentSheet = useMemo(() => {
    if (sheets.length === 0) return null;
    return sheets.find(s => s.sheetName === activeSheetName) || sheets[sheets.length - 1];
  }, [sheets, activeSheetName]);

  // Direct cash collected in hand by this vehicle's tour & deposited to Office Counter
  const cashDepositedToCounter = useMemo(() => {
    return invoices
      .filter(inv => inv.Route === selectedRoute && inv.Date >= startDate && inv.Date <= endDate)
      .reduce((sum, inv) => sum + inv.CashReceived, 0);
  }, [invoices, selectedRoute, startDate, endDate]);

  // Overall Loading Manifest & Stock metrics matching the selected Route Vehicle
  const overallVehicleStockReport = useMemo(() => {
    if (!currentSheet) {
      return { openQty: 0, openVal: 0, loadQty: 0, loadVal: 0, soldQty: 0, soldVal: 0, retQty: 0, retVal: 0 };
    }

    let openQty = 0;
    let openVal = 0;
    let loadQty = 0;
    let loadVal = 0;
    let soldQty = 0;
    let soldVal = 0;
    let retQty = 0;
    let retVal = 0;

    currentSheet.rows.forEach(row => {
      const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
      const salePrice = p?.Sale_Rate_Wholesale || 300;

      if (selectedRoute === "Sinhgad") {
        openQty += row.Sinhgad_Open;
        openVal += row.Sinhgad_Open * salePrice;

        const loads = row.Sinhgad_Load1 + row.Sinhgad_Load2;
        loadQty += loads;
        loadVal += loads * salePrice;

        soldQty += row.Sinhgad_Sale;
        soldVal += row.Sinhgad_Sale * salePrice;

        retQty += row.Sinhgad_Load_In;
        retVal += row.Sinhgad_Load_In * salePrice;
      } else if (selectedRoute === "Purandar") {
        openQty += row.Purandar_Open;
        openVal += row.Purandar_Open * salePrice;

        const loads = row.Purandar_Load1 + row.Purandar_Load2;
        loadQty += loads;
        loadVal += loads * salePrice;

        soldQty += row.Purandar_Sale;
        soldVal += row.Purandar_Sale * salePrice;

        retQty += row.Purandar_Load_In;
        retVal += row.Purandar_Load_In * salePrice;
      } else if (selectedRoute === "Rajgad") {
        openQty += row.Rajgad_Open;
        openVal += row.Rajgad_Open * salePrice;

        const loads = row.Rajgad_Load1 + row.Rajgad_Load2;
        loadQty += loads;
        loadVal += loads * salePrice;

        soldQty += row.Rajgad_Sale;
        soldVal += row.Rajgad_Sale * salePrice;

        retQty += row.Rajgad_Load_In;
        retVal += row.Rajgad_Load_In * salePrice;
      }
    });

    return { openQty, openVal, loadQty, loadVal, soldQty, soldVal, retQty, retVal };
  }, [currentSheet, selectedRoute]);

  // Expenses separation logic
  const serviceExpenses = useMemo(() => {
    // "Service Expenses": Fuel, tolls, puncture, mechanical maintenance, vehicle repairs, files
    return expenses.filter(exp => {
      const matchDate = exp.Date >= startDate && exp.Date <= endDate;
      const isService = exp.Category === "Vehicle Fuel & Maintenance" || 
                        exp.Description.toLowerCase().includes("fuel") ||
                        exp.Description.toLowerCase().includes("diesel") ||
                        exp.Description.toLowerCase().includes("toll") ||
                        exp.Description.toLowerCase().includes("repair") ||
                        exp.Description.toLowerCase().includes("puncture");
      return matchDate && isService;
    });
  }, [expenses, startDate, endDate]);

  const personalExpenses = useMemo(() => {
    // "Personal Expenses": Driver wages, food list bhatta, lunch allowance, tea sessions, staff bhatta
    return expenses.filter(exp => {
      const matchDate = exp.Date >= startDate && exp.Date <= endDate;
      const isPersonal = exp.Category === "Employee Wages" ||
                         exp.Description.toLowerCase().includes("lunch") ||
                         exp.Description.toLowerCase().includes("food") ||
                         exp.Description.toLowerCase().includes("tea") ||
                         exp.Description.toLowerCase().includes("wage") ||
                         exp.Description.toLowerCase().includes("bhatta");
      return matchDate && isPersonal;
    });
  }, [expenses, startDate, endDate]);

  const totalServiceExpenseAmount = useMemo(() => {
    return serviceExpenses.reduce((sum, e) => sum + e.Amount, 0);
  }, [serviceExpenses]);

  const totalPersonalExpenseAmount = useMemo(() => {
    return personalExpenses.reduce((sum, e) => sum + e.Amount, 0);
  }, [personalExpenses]);

  // Total invoice statistics
  const invStats = useMemo(() => {
    const routeInvoices = invoices.filter(i => i.Route === selectedRoute && i.Date >= startDate && i.Date <= endDate);
    let totalAmt = 0;
    let cashAmt = 0;
    let onlineUPI = 0;
    let chequeAmt = 0;
    let pendingCredit = 0;
    
    routeInvoices.forEach(inv => {
      totalAmt += inv.TotalAmount;
      cashAmt += inv.CashReceived;
      onlineUPI += inv.UPIReceived;
      chequeAmt += inv.ChequeReceived;
      pendingCredit += inv.CreditAmount;
    });

    return {
      count: routeInvoices.length,
      totalAmt,
      cashAmt,
      onlineUPI,
      chequeAmt,
      pendingCredit
    };
  }, [invoices, selectedRoute, startDate, endDate]);

  return (
    <div className="space-y-6 animate-fade-in" id="service-report-tab">
      
      {/* Target Routing Command Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 font-mono text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-amber-glow">
            <Truck size={18} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Logistics Intelligence</span>
            <span className="text-sm font-bold text-white font-tech uppercase tracking-wide">Vehicle Transit Route Sheets</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-85">
          
          {/* Target route selection */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-semibold uppercase tracking-wider block">Target Delivery Vehicle</label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value as any)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2 cursor-pointer h-10 outline-none focus:border-amber-glow"
            >
              <option value="Sinhgad">Sinhgad route vehicle (v1)</option>
              <option value="Purandar">Purandar route vehicle (v2)</option>
              <option value="Rajgad">Rajgad route vehicle (v3)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-semibold uppercase tracking-wider block">Transit Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2 h-10 outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-semibold uppercase tracking-wider block">Transit End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2 h-10 outline-none"
            />
          </div>

        </div>
      </div>

      {/* RENDER 1: CASH DEPOSITED TO COUNTER PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Cash Depositable */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-amber-glow/20 p-5 rounded-2xl flex flex-col justify-between col-span-1 md:col-span-2 font-mono">
          <div className="flex justify-between items-center text-[10px] text-amber-glow uppercase tracking-widest font-bold">
            <span>Cash Deposited to Counter Ledger</span>
            <Coins size={15} />
          </div>
          <div className="mt-5">
            <h1 className="text-3xl font-black text-white">
              ₹{cashDepositedToCounter.toLocaleString("en-IN")}
            </h1>
            <p className="text-[10px] text-zinc-400 mt-1 font-sans">
              Physical collections from bills assigned on **{selectedRoute}** route was hand-rolled and deposited directly to Office Safety cash drawer.
            </p>
          </div>
        </div>

        {/* Invoice counter stats */}
        <div className="bg-zinc-900/50 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between font-mono">
          <span className="uppercase text-[9px] text-zinc-500 font-bold tracking-wider">Retail Customer Deliveries & Sale</span>
          <div className="mt-5">
            <h3 className="text-xl font-bold text-white">{invStats.count} Customers</h3>
            <div className="text-[10px] space-y-1 mt-1 text-zinc-450 font-sans font-bold">
              <div className="flex justify-between"><span>CASH:</span><span className="text-emerald-400">₹{invStats.cashAmt.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>ONLINE (UPI):</span><span className="text-blue-400">₹{invStats.onlineUPI.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>CHEQUE:</span><span className="text-purple-400">₹{invStats.chequeAmt.toLocaleString()}</span></div>
              <div className="flex justify-between text-rose-455"><span>CREDIT:</span><span>₹{invStats.pendingCredit.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* RENDER 2: OVERALL LOADING STOCK MANIFEST */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 font-mono text-xs text-zinc-300 space-y-6">
        <div className="border-b border-zinc-805 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-white uppercase block">Vehicle Cargo (Godown Load In/Out)</span>
            <p className="text-[10px] text-zinc-450">Displays opening trip stocks, loaded goods, items billed sold and cargo returned.</p>
          </div>
          <div className="text-[11px] font-bold text-amber-glow uppercase bg-zinc-950 px-2 py-1 border border-zinc-800 rounded-md">
            Route: {selectedRoute}
          </div>
        </div>

        {currentSheet ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              
              {/* Opening stock */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                <span className="text-[9px] uppercase text-zinc-500 tracking-wider">A: Opening Stock</span>
                <div>
                  <strong className="text-sm font-bold text-white block">{overallVehicleStockReport.openQty} Cases</strong>
                  <span className="text-[8px] text-zinc-500">Value (Wholesale): ₹{overallVehicleStockReport.openVal.toLocaleString()}</span>
                </div>
              </div>

              {/* Loaded stock */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                <span className="text-[9px] uppercase text-zinc-500 tracking-wider">B: Load Out (L1 + L2)</span>
                <div>
                  <strong className="text-sm font-bold text-amber-500 block">{overallVehicleStockReport.loadQty} Cases</strong>
                  <span className="text-[8px] text-zinc-500">Value (Wholesale): ₹{overallVehicleStockReport.loadVal.toLocaleString()}</span>
                </div>
              </div>

              {/* Sold Stock */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                <span className="text-[9px] uppercase text-zinc-550 block">C: Sales</span>
                <div>
                  <strong className="text-sm font-bold text-emerald-400 block">{overallVehicleStockReport.soldQty} Cases</strong>
                  <span className="text-[8px] text-emerald-600">Revenues: ₹{overallVehicleStockReport.soldVal.toLocaleString()}</span>
                </div>
              </div>

              {/* Return Stock */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                <span className="text-[9px] uppercase text-zinc-550 block">D: Load In (Unsold Returned)</span>
                <div>
                  <strong className="text-sm font-bold text-indigo-400 block">{overallVehicleStockReport.retQty} Cases</strong>
                  <span className="text-[8px] text-indigo-600">Stock Returned: ₹{overallVehicleStockReport.retVal.toLocaleString()}</span>
                </div>
              </div>

            </div>

            {/* SKU wise itemized table */}
            <div className="border border-zinc-850 rounded-xl overflow-hidden mt-4 bg-zinc-950">
              <div className="p-3 bg-zinc-900 border-b border-zinc-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="text-white font-bold text-[10px] uppercase">Route SKU Stock Ledger</span>
                  <span className="text-zinc-500 uppercase text-[9px] ml-2 block sm:inline">Fleet Log: {selectedRoute}</span>
                </div>
                
                {/* SKU search filter */}
                <div className="relative w-full md:w-64">
                  <Hash size={12} className="absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filter products..."
                    value={skuSearchQuery}
                    onChange={(e) => setSkuSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white outline-none focus:border-amber-glow"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase bg-[#0b0c10]">
                      <th className="py-2.5 px-3">SKU Name</th>
                      <th className="py-2.5 px-3 text-center">Opening Stock</th>
                      <th className="py-2.5 px-3 text-center">Load Out (L1+L2)</th>
                      <th className="py-2.5 px-3 text-center text-emerald-400 font-bold">Sold Cases</th>
                      <th className="py-2.5 px-3 text-center text-indigo-400">Load In (Returned)</th>
                      <th className="py-2.5 px-3 text-center text-amber-glow font-bold">Closing Onboard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {currentSheet.rows
                      .filter(row => {
                        if (!skuSearchQuery) return true;
                        const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
                        const sName = (p?.Item_Name || row.Net_Qty || "").toLowerCase();
                        return sName.includes(skuSearchQuery.toLowerCase()) || row.Item_Code.toLowerCase().includes(skuSearchQuery.toLowerCase());
                      })
                      .map((row, idx) => {
                        const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
                        const sName = p ? getSimplifiedProductName(p.Item_Name) : row.Net_Qty;
                        
                        let open = 0, loadOut = 0, sold = 0, loadIn = 0;
                        if (selectedRoute === "Sinhgad") {
                          open = row.Sinhgad_Open;
                          loadOut = row.Sinhgad_Load1 + row.Sinhgad_Load2;
                          sold = row.Sinhgad_Sale;
                          loadIn = row.Sinhgad_Load_In;
                        } else if (selectedRoute === "Purandar") {
                          open = row.Purandar_Open;
                          loadOut = row.Purandar_Load1 + row.Purandar_Load2;
                          sold = row.Purandar_Sale;
                          loadIn = row.Purandar_Load_In;
                        } else if (selectedRoute === "Rajgad") {
                          open = row.Rajgad_Open;
                          loadOut = row.Rajgad_Load1 + row.Rajgad_Load2;
                          sold = row.Rajgad_Sale;
                          loadIn = row.Rajgad_Load_In;
                        }

                        const closing = Math.max(0, open + loadOut - sold - loadIn);

                        return (
                          <tr key={idx} className="hover:bg-zinc-900">
                            <td className="py-2 px-3 font-sans">
                              <span className="font-bold text-white block text-xs">{sName}</span>
                              <span className="text-[8px] text-zinc-500 font-mono">{row.Item_Code}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-bold">{open}</td>
                            <td className="py-2 px-3 text-center font-bold text-amber-500">{loadOut}</td>
                            <td className="py-2 px-3 text-center font-bold text-emerald-400">{sold}</td>
                            <td className="py-2 px-3 text-center font-bold text-indigo-400">{loadIn}</td>
                            <td className="py-2 px-3 text-center font-bold text-amber-glow">{closing}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {currentSheet.rows.filter(row => {
                  if (!skuSearchQuery) return true;
                  const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
                  const sName = (p?.Item_Name || row.Net_Qty || "").toLowerCase();
                  return sName.includes(skuSearchQuery.toLowerCase()) || row.Item_Code.toLowerCase().includes(skuSearchQuery.toLowerCase());
                }).length === 0 && (
                  <div className="p-10 text-center text-zinc-600 font-mono text-[10px] uppercase">
                    No matching SKUs found on this route trip.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center italic text-zinc-650">No loading manifest ingested for this inventory day context.</div>
        )}
      </div>


      {/* RENDER 3: VEHICLE EXPENSES - SERVICE EXPENSES VS PERSONAL EXPENSES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
        
        {/* Service Expenses (Fuel, Tolls, Mechanical repairs) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-805 pb-3">
            <div>
              <span className="text-xs font-bold text-zinc-100 uppercase block flex items-center gap-1">
                <Wrench size={13} className="text-amber-glow" />
                Mechanical & Service Expenses
              </span>
              <p className="text-[9px] text-zinc-500 mt-0.5">Vessel fuel tanks diesel loading, road tolls or transit hazard repairs.</p>
            </div>
            <span className="bg-amber-950/30 text-amber-500 font-bold px-2.5 py-1 rounded text-[10px]">
              ₹{totalServiceExpenseAmount.toLocaleString()} Out
            </span>
          </div>

          <div className="overflow-y-auto max-h-[220px] divide-y divide-zinc-850 space-y-2.5">
            {serviceExpenses.length === 0 ? (
              <div className="text-center py-10 italic text-zinc-650">No vehicle service expenses logged.</div>
            ) : (
              serviceExpenses.map(exp => (
                <div key={exp.Id} className="flex justify-between py-2 items-center">
                  <div>
                    <strong className="text-white block uppercase text-[10px]">{exp.Description}</strong>
                    <span className="text-[8px] text-zinc-500 block">Date: {exp.Date} &bull; Route: {exp.VehicleOrLocation}</span>
                  </div>
                  <strong className="text-amber-glow font-bold">₹{exp.Amount}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Personal Expenses (Driver Bhatta, Wage payouts, Lunch allowance) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-805 pb-3">
            <div>
              <span className="text-xs font-bold text-zinc-100 uppercase block flex items-center gap-1">
                <User size={13} className="text-emerald-500" />
                Wages, Food & Staff Bhatta
              </span>
              <p className="text-[9px] text-zinc-505 mt-0.5">Driver allowance daily bhatta payouts, helper lunches, loading tea logs.</p>
            </div>
            <span className="bg-emerald-950/20 text-emerald-400 font-bold px-2.5 py-1 rounded text-[10px]">
              ₹{totalPersonalExpenseAmount.toLocaleString()} Out
            </span>
          </div>

          <div className="overflow-y-auto max-h-[220px] divide-y divide-zinc-850 space-y-2.5">
            {personalExpenses.length === 0 ? (
              <div className="text-center py-10 italic text-zinc-650">No staff/personal expenses logged.</div>
            ) : (
              personalExpenses.map(exp => (
                <div key={exp.Id} className="flex justify-between py-2 items-center">
                  <div>
                    <strong className="text-white block uppercase text-[10px]">{exp.Description}</strong>
                    <span className="text-[8px] text-zinc-500 block">Date: {exp.Date} &bull; wage receiver: {exp.EmployeeName || "Direct Cargo Staff"}</span>
                  </div>
                  <strong className="text-emerald-400 font-bold">₹{exp.Amount}</strong>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
