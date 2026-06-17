/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { DailyServiceSheet } from "../types";
import { PRODUCTS } from "../data/masterData";
import { 
  Package, 
  Database, 
  Search, 
  Truck, 
  Layers, 
  AlertCircle,
  Eye,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  List,
  AlertTriangle,
  FolderOpen
} from "lucide-react";

interface InventoryProps {
  sheets: DailyServiceSheet[];
  activeSheetName: string;
}

export default function Inventory({ sheets, activeSheetName }: InventoryProps) {
  // Local control states
  const [viewMode, setViewMode] = useState<"brand" | "compact">("brand"); // 'brand' (grouped) vs 'compact' (excel list)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  
  // Track expanded brand in Grouped view
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  // Pagination for Compact view
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.sheetName === activeSheetName) || sheets[sheets.length - 1];
  }, [sheets, activeSheetName]);

  // Map absolute product parameters
  const inventoryItems = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.rows.map(row => {
      const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
      return {
        itemCode: row.Item_Code,
        name: p?.Item_Name || row.Item_Code,
        brand: row.Brand || "Other",
        warehouse: row.Total_Closing,
        onVehicle: (row.Sinhgad_Open + row.Sinhgad_Load1 + row.Sinhgad_Load2 - row.Sinhgad_Sale - row.Sinhgad_Load_In) +
                   (row.Purandar_Open + row.Purandar_Load1 + row.Purandar_Load2 - row.Purandar_Sale - row.Purandar_Load_In) +
                   (row.Rajgad_Open + row.Rajgad_Load1 + row.Rajgad_Load2 - row.Rajgad_Sale - row.Rajgad_Load_In),
        price: p?.Purchase_Rate || p?.MRP || 150
      };
    });
  }, [activeSheet]);

  // Aggregate stats
  const statsSummary = useMemo(() => {
    let totalCases = 0;
    let totalVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventoryItems.forEach(item => {
      totalCases += item.warehouse;
      totalVal += item.warehouse * item.price;
      if (item.warehouse === 0) {
        outOfStockCount++;
      } else if (item.warehouse <= 10) {
        lowStockCount++;
      }
    });

    return { totalCases, totalVal, lowStockCount, outOfStockCount };
  }, [inventoryItems]);

  // Group inventory items by Brand
  const brandGroups = useMemo(() => {
    const groups: Record<string, {
      brandName: string;
      skus: typeof inventoryItems;
      totalCases: number;
      totalValue: number;
      lowStockSkus: number;
    }> = {};

    inventoryItems.forEach(item => {
      const bName = item.brand;
      if (!groups[bName]) {
        groups[bName] = {
          brandName: bName,
          skus: [],
          totalCases: 0,
          totalValue: 0,
          lowStockSkus: 0
        };
      }
      groups[bName].skus.push(item);
      groups[bName].totalCases += item.warehouse;
      groups[bName].totalValue += item.warehouse * item.price;
      if (item.warehouse <= 10) {
        groups[bName].lowStockSkus++;
      }
    });

    return Object.values(groups).sort((a, b) => b.totalCases - a.totalCases);
  }, [inventoryItems]);

  // Quick list of all brands
  const brandNames = useMemo(() => {
    return ["All", ...brandGroups.map(g => g.brandName)];
  }, [brandGroups]);

  // Computed/filtered items for Compact Search table
  const filteredItems = useMemo(() => {
    let filtered = inventoryItems;

    // Apply text search
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.itemCode.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
      );
    }

    // Apply Brand filter
    if (selectedBrand !== "All") {
      filtered = filtered.filter(item => item.brand === selectedBrand);
    }

    // Apply Category Status filter
    if (selectedStatus === "Empty") {
      filtered = filtered.filter(item => item.warehouse === 0);
    } else if (selectedStatus === "Low") {
      filtered = filtered.filter(item => item.warehouse > 0 && item.warehouse <= 10);
    } else if (selectedStatus === "InStock") {
      filtered = filtered.filter(item => item.warehouse > 10);
    }

    return filtered;
  }, [inventoryItems, searchQuery, selectedBrand, selectedStatus]);

  // Paginated compact items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  if (!activeSheet) {
    return (
      <div className="bg-[#07080a] p-8 text-center border-2 border-dashed border-zinc-800 rounded-xl font-mono text-zinc-500 text-xs">
        <Database className="animate-spin text-amber-glow mx-auto mb-2" size={24} />
         No inventory worksheet ledger records found. Create or rollover a sheet.
      </div>
    );
  }

  // Simplified Product Name helper
  const getSimplifiedName = (fullName: string) => {
    return fullName
      .replace(/FRUIT JUICE DRINK/gi, "Juice")
      .replace(/CARBONATED BEVERAGE/gi, "Fizz")
      .replace(/PACKAGED DRINKING WATER/gi, "Water")
      .replace(/SAHYADRI WATER/gi, "Sahyadri")
      .replace(/FMCG STOCKS /gi, "")
      .trim();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-zinc-300" id="inventory-tab">
      
      {/* KPI Stats Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-[#0d0f13] border border-zinc-800 rounded-2xl gap-4">
        <div>
          <span className="text-[10px] text-amber-glow uppercase tracking-widest font-mono font-bold block">Physical Ledger Balance</span>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5 flex items-center gap-2">
            <Package size={20} className="text-amber-glow" />
            Warehouse Inventory & Stock Valuation
          </h2>
          <p className="text-zinc-500 text-xs mt-1">
            Real-time physical stock counting for 126 FMCG beverage SKUs across Warehouse A and B.
          </p>
        </div>

        {/* High-level stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto text-xs font-mono">
          <div className="bg-[#07080a] border border-zinc-900 p-3 rounded-xl">
            <span className="text-zinc-500 text-[9px] block uppercase">Inventory Cases</span>
            <span className="text-sm font-bold text-white block mt-0.5">{statsSummary.totalCases} Cs</span>
          </div>
          <div className="bg-[#07080a] border border-zinc-900 p-3 rounded-xl col-span-1">
            <span className="text-zinc-500 text-[9px] block uppercase">Asset Valuation</span>
            <span className="text-sm font-bold text-amber-glow block mt-0.5">₹{statsSummary.totalVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="bg-amber-950/20 border border-amber-900/30 p-3 rounded-xl text-amber-400">
            <span className="text-amber-500/60 text-[9px] block uppercase">Low Stock SKUs</span>
            <span className="text-sm font-bold block mt-0.5">{statsSummary.lowStockCount} items</span>
          </div>
          <div className="bg-rose-950/30 border border-rose-900/40 p-3 rounded-xl text-rose-455">
            <span className="text-rose-500/50 text-[9px] block uppercase">Out of Stock</span>
            <span className="text-sm font-bold block mt-0.5">{statsSummary.outOfStockCount} items</span>
          </div>
        </div>
      </div>

      {/* View Switcher and Filters Toolbar */}
      <div className="bg-[#0e0f14] border border-zinc-850 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          {/* Group vs Compact Mode Buttons */}
          <div className="flex bg-[#07080a] p-1 border border-zinc-800 rounded-xl select-none text-[10px] uppercase font-bold font-mono text-zinc-400">
            <button
              onClick={() => { setViewMode("brand"); setExpandedBrand(null); }}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "brand" ? "bg-amber-glow/15 border border-amber-glow/30 text-amber-glow" : "border border-transparent hover:text-white"
              }`}
            >
              <LayoutGrid size={12} />
              Brand Overview Group
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "compact" ? "bg-amber-glow/15 border border-amber-glow/30 text-amber-glow" : "border border-transparent hover:text-white"
              }`}
            >
              <List size={12} />
              Compact Sheet List
            </button>
          </div>

          {/* Quick Query Filters */}
          <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative w-full sm:w-48 text-xs font-mono">
              <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-650" />
              <input
                type="text"
                value={searchQuery}
                placeholder="Query SKU code / brand..."
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                  if (viewMode === "brand") setViewMode("compact"); // Auto-switch to list for clean searching
                }}
                className="w-full bg-[#07080a] border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-[11px] text-white focus:outline-none placeholder-zinc-700"
              />
            </div>

            {/* Quick Status Pill Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="bg-[#07080a] border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] text-zinc-350 cursor-pointer font-mono"
            >
              <option value="All">All Statuses</option>
              <option value="InStock">In Stock Only</option>
              <option value="Low">Low Stock (≤10 cases)</option>
              <option value="Empty">Out of Stock (Empty)</option>
            </select>
          </div>
        </div>

        {/* Brand Names horizontal list (Only if compact list view is active) */}
        {viewMode === "compact" && (
          <div className="border-t border-zinc-900 pt-3 flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-mono">
            <span className="text-zinc-600 shrink-0 font-bold uppercase">Brand Sector:</span>
            {brandNames.map(bName => (
              <button
                key={bName}
                onClick={() => { setSelectedBrand(bName); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full border transition shrink-0 uppercase tracking-tight cursor-pointer font-bold ${
                  selectedBrand === bName 
                    ? "bg-zinc-100 text-[#07080a] border-zinc-100" 
                    : "bg-[#07080a] text-zinc-455 border-zinc-800 hover:text-white hover:bg-zinc-90 w"
                }`}
              >
                {bName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW PANEL 1: Grouped Brand Overview Card Grid */}
      {viewMode === "brand" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="inventory-grouped-brand-view">
          {brandGroups.map((group, idx) => {
            const isSelected = expandedBrand === group.brandName;

            return (
              <div 
                key={idx} 
                className={`bg-[#0e1014] border-2 rounded-2xl p-5 hover:border-zinc-750 transition flex flex-col justify-between ${
                  isSelected ? "border-amber-glow/60 shadow-lg shadow-amber-glow/5" : "border-zinc-850"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Brand Hub Partner</span>
                    {group.lowStockSkus > 0 && (
                      <span className="flex items-center gap-1 text-[8px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-900/30">
                        <AlertTriangle size={10} />
                        {group.lowStockSkus} SKUs Low
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-white mt-1 uppercase font-mono tracking-wide">{group.brandName}</h3>
                  <p className="text-[10px] text-zinc-550 mt-0.5 font-mono">Includes {group.skus.length} individual SKUs</p>

                  <div className="grid grid-cols-2 gap-2 bg-[#07080a] p-3 rounded-xl border border-zinc-900 text-xs font-mono mt-4">
                    <div>
                      <span className="text-[9px] text-zinc-650 block uppercase font-bold">Godown stock</span>
                      <span className="text-white font-extrabold block text-sm mt-0.5">{group.totalCases} cases</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-650 block uppercase font-bold">Asset net worth</span>
                      <span className="text-emerald-400 font-extrabold block mt-0.5">₹{group.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-900">
                  <button
                    onClick={() => setExpandedBrand(isSelected ? null : group.brandName)}
                    className="w-full py-2 bg-zinc-950 hover:bg-zinc-90 w text-amber-glow font-mono text-[10px] font-bold uppercase rounded-lg border border-zinc-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FolderOpen size={11} />
                    {isSelected ? "Collapse Items Details" : `Inspect ${group.skus.length} Active SKUs`}
                    <ChevronRight size={10} className={`transform transition ${isSelected ? "rotate-90 text-white" : ""}`} />
                  </button>
                </div>

                {/* Expanded items list inside the individual brand card */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-zinc-900/60 max-h-80 overflow-y-auto space-y-2 font-mono">
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Itemized SKU Stocks:</span>
                    <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/40">
                      {group.skus.map((sku, sIdx) => {
                        const isSkuLow = sku.warehouse <= 10 && sku.warehouse > 0;
                        const isSkuEmpty = sku.warehouse === 0;

                        return (
                          <div key={sIdx} className="p-2.5 flex justify-between items-center text-[10px] bg-zinc-900/10 hover:bg-zinc-900/30">
                            <div className="max-w-[70%]">
                              <span className="font-bold text-zinc-300 block leading-tight font-sans text-xs">
                                {getSimplifiedName(sku.name)}
                              </span>
                              <span className="text-[9px] text-zinc-550 block mt-0.5">{sku.itemCode}</span>
                            </div>

                            <div className="text-right whitespace-nowrap">
                              <span className={`block font-bold font-mono text-xs ${
                                isSkuEmpty ? "text-rose-455" : isSkuLow ? "text-amber-500" : "text-white"
                              }`}>
                                {sku.warehouse} Cs
                              </span>
                              <span className="text-[8px] text-zinc-500 block mt-0.5">₹{(sku.warehouse * sku.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW PANEL 2: Excel Compact Sheet List View with pagination */}
      {viewMode === "compact" && (
        <div className="bg-[#0e1014] border border-zinc-850 rounded-2xl overflow-hidden shadow-lg select-none" id="inventory-compact-sheet-view">
          
          <div className="p-4 bg-zinc-950 border-b border-zinc-850 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-mono">
            <span className="text-zinc-505 font-bold uppercase text-[9.5px]">Compact SKU Spreadsheet Registry</span>
            <span className="text-zinc-400">Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} available SKUs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-[#07080a] text-zinc-400 border-b border-zinc-850 h-9 font-bold uppercase text-[9.5px]">
                  <th className="p-3">SKU Code</th>
                  <th className="p-3">Brand Sector</th>
                  <th className="p-3">Simplified Product Name</th>
                  <th className="p-3 text-right text-[#ffb300]">Transit Dispatches</th>
                  <th className="p-3 text-right text-emerald-450">Warehouse Stock</th>
                  <th className="p-3 text-right">Asset Net Worth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 text-zinc-300">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-zinc-500 italic">
                      No SKU records matched the active filters. Modify parameters to inspect other stocks.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => {
                    const isLow = item.warehouse > 0 && item.warehouse <= 10;
                    const isEmpty = item.warehouse === 0;

                    return (
                      <tr key={idx} className="hover:bg-zinc-950/60 h-10">
                        <td className="p-3 font-semibold text-zinc-400 whitespace-nowrap">{item.itemCode}</td>
                        <td className="p-3">
                          <span className="bg-[#07080a] border border-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[9px] uppercase font-bold">
                            {item.brand}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] font-sans font-bold text-white max-w-sm truncate" title={item.name}>
                          {getSimplifiedName(item.name)}
                        </td>
                        <td className="p-3 text-right text-zinc-400">
                          {item.onVehicle > 0 ? (
                            <span className="text-amber-glow font-bold bg-amber-glow/5 border border-amber-glow/10 px-1.5 py-0.5 rounded">
                              + {item.onVehicle} Cs
                            </span>
                          ) : (
                            <span className="text-zinc-650">0 cases</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`inline-block font-extrabold font-mono text-xs ${
                            isEmpty ? "text-rose-455 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-900/30" : 
                            isLow ? "text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-900/30" : 
                            "text-emerald-400"
                          }`}>
                            {item.warehouse} Cases
                          </span>
                        </td>
                        <td className="p-3 text-right text-white font-semibold">
                          ₹{(item.warehouse * item.price).toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination Footer only shown if pages exist */}
          {totalPages > 1 && (
            <div className="p-4 bg-zinc-950 border-t border-zinc-850 flex justify-between items-center text-xs font-mono select-none">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 bg-[#07080a] border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                &larr; Previous Page
              </button>
              
              <span className="text-zinc-500 block">Page <b className="text-white">{currentPage}</b> of {totalPages}</span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 bg-[#07080a] border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Next Page &rarr;
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
