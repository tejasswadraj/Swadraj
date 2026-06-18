/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Vehicle, Warehouse, SupplierCreditNote, Employee, Supplier } from "../types";
import { PRODUCTS, SUPPLIERS } from "../data/masterData";
import { 
  Truck, 
  Building2, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Coins, 
  User, 
  Info,
  Sliders,
  MapPin,
  ClipboardList
} from "lucide-react";
import { getSimplifiedProductName } from "./StockReconciliation";

interface ConnectedRegistriesProps {
  vehicles: Vehicle[];
  onUpdateVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  warehouses: Warehouse[];
  onUpdateWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  supplierCreditNotes: SupplierCreditNote[];
  onUpdateSupplierCreditNotes: React.Dispatch<React.SetStateAction<SupplierCreditNote[]>>;
  employees: Employee[];
  suppliers: Supplier[];
}

export default function ConnectedRegistries({
  vehicles,
  onUpdateVehicles,
  warehouses,
  onUpdateWarehouses,
  supplierCreditNotes,
  onUpdateSupplierCreditNotes,
  employees,
  suppliers
}: ConnectedRegistriesProps) {
  const [activeSubTab, setActiveSubTab] = useState<"fleet" | "warehouses" | "credit-notes">("fleet");

  // Form State for adding a vehicle
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehicleReg, setNewVehicleReg] = useState("");
  const [newVehicleDriver, setNewVehicleDriver] = useState("");
  const [newVehicleStaff, setNewVehicleStaff] = useState("");
  const [newVehicleCapacity, setNewVehicleCapacity] = useState(150);

  // Form State for adding a warehouse
  const [showAddWarehouseForm, setShowAddWarehouseForm] = useState(false);
  const [newWhName, setNewWhName] = useState("");
  const [newWhLoc, setNewWhLoc] = useState("");
  const [newWhCapacity, setNewWhCapacity] = useState(2500);

  // Form State for adding Supplier Credit Note
  const [showAddCreditNoteForm, setShowAddCreditNoteForm] = useState(false);
  const [scnSupplierCode, setScnSupplierCode] = useState("");
  const [scnCreditAmt, setScnCreditAmt] = useState(0);
  const [scnNotes, setScnNotes] = useState("");
  const [scnReturnSku, setScnReturnSku] = useState("");
  const [scnReturnCases, setScnReturnCases] = useState(10);
  const [scnReturnReason, setScnReturnReason] = useState<"Expired" | "Damaged" | "Excess Supply">("Expired");

  // Handle vehicle submission
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleName || !newVehicleReg) {
      alert("Please fill in Vehicle Name and Registration Number.");
      return;
    }
    const newVeh: Vehicle = {
      Id: `veh_ref_${Date.now()}`,
      Name: newVehicleName,
      RegistrationNumber: newVehicleReg.toUpperCase(),
      PrimaryDriverId: newVehicleDriver || "emp_1",
      PrimarySalespersonId: newVehicleStaff || "emp_1",
      LoadCapacityCases: Number(newVehicleCapacity) || 150,
      Status: "At-warehouse"
    };

    onUpdateVehicles(prev => [...prev, newVeh]);
    setNewVehicleName("");
    setNewVehicleReg("");
    setShowAddVehicleForm(false);
    alert(`Vehicle unit "${newVehicleName}" added to the active fleet registry.`);
  };

  // Handle warehouse submission
  const handleAddWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName || !newWhLoc) {
      alert("Please enter Warehouse Name and Location.");
      return;
    }
    const newWh: Warehouse = {
      Id: `wh_ref_${Date.now()}`,
      Name: newWhName,
      Location: newWhLoc,
      AssignedStaffIds: ["emp_4"],
      CapacityCases: Number(newWhCapacity) || 2000,
      Status: "Active"
    };

    onUpdateWarehouses(prev => [...prev, newWh]);
    setNewWhName("");
    setNewWhLoc("");
    setShowAddWarehouseForm(false);
    alert(`Warehouse node "${newWhName}" added to system configurations.`);
  };

  // Handle supplier credit note submission
  const handleAddCreditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scnSupplierCode || scnCreditAmt <= 0) {
      alert("Supplier and refund credit amount must be declared.");
      return;
    }
    const supplierObj = suppliers.find(s => s.Supplier_Code === scnSupplierCode);
    const mockSku = PRODUCTS.find(p => p.Item_Code === scnReturnSku || p.Supplier_Code === scnSupplierCode) || PRODUCTS[0];

    const newScn: SupplierCreditNote = {
      Id: `SCN-${Math.floor(1000 + Math.random() * 9000)}`,
      SupplierCode: scnSupplierCode,
      SupplierName: supplierObj?.Supplier_Name || "FMCG Partner Ltd",
      Date: new Date().toISOString().split("T")[0],
      ProductsReturned: [
        {
          ItemCode: mockSku.Item_Code,
          ItemName: mockSku.Item_Name,
          QuantityCases: Number(scnReturnCases) || 10,
          Reason: scnReturnReason
        }
      ],
      CreditAmount: Number(scnCreditAmt),
      Notes: scnNotes || "Processed return of expired bottle stocks at PCMC depot.",
      Status: "Pending"
    };

    onUpdateSupplierCreditNotes(prev => [newScn, ...prev]);
    setScnSupplierCode("");
    setScnCreditAmt(0);
    setScnNotes("");
    setShowAddCreditNoteForm(false);
    alert(`Supplier Credit Note reference "${newScn.Id}" registered successfully.`);
  };

  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.Id, e.Name]));
  }, [employees]);

  return (
    <div className="space-y-6 animate-fade-in" id="connected-registries">
      
      {/* Title block */}
      <div className="bg-[#0b0c10] border border-zinc-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xl font-bold uppercase tracking-tight text-white font-mono">
              🏭 Connected Masters & Configuration Registers
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
            Oversee first-class operational variables for vehicles, central godown warehouses, and manufacturer credit refunds in the Swadraj PCMC logistics corridor.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-[#07080a] p-1 rounded-xl border border-zinc-850 self-start md:self-auto shrink-0">
          <button
            onClick={() => { setActiveSubTab("fleet"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center space-x-1.5 ${
              activeSubTab === "fleet" ? "bg-amber-glow text-black font-extrabold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Truck size={13} />
            <span>Active Fleet ({vehicles.length})</span>
          </button>
          <button
            onClick={() => { setActiveSubTab("warehouses"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center space-x-1.5 ${
              activeSubTab === "warehouses" ? "bg-amber-glow text-black font-extrabold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Building2 size={13} />
            <span>Warehouses ({warehouses.length})</span>
          </button>
          <button
            onClick={() => { setActiveSubTab("credit-notes"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center space-x-1.5 ${
              activeSubTab === "credit-notes" ? "bg-amber-glow text-black font-extrabold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Coins size={13} />
            <span>Credit Notes ({supplierCreditNotes.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-PANEL 1: FLEET REGISTRY */}
      {activeSubTab === "fleet" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#ffb300] font-mono">🚛 3-VEHICLE ACTIVE DELIVERY FLEET</h3>
            <button
              onClick={() => setShowAddVehicleForm(!showAddVehicleForm)}
              className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 px-4.5 py-1.5 rounded-xl text-xs font-bold text-amber-glow transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Register New Fleet Vehicle</span>
            </button>
          </div>

          {showAddVehicleForm && (
            <form onSubmit={handleAddVehicle} className="bg-zinc-950 border border-[#ffb300]/20 p-5 rounded-xl space-y-4 animate-fade-in pb-6 max-w-xl">
              <h4 className="text-xs uppercase font-mono font-black text-amber-glow">Register New Vehicle Unit parameters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1">Vehicle Name (e.g. Torna)</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    value={newVehicleName}
                    onChange={(e) => setNewVehicleName(e.target.value)}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Registration Plate No.</label>
                  <input
                    type="text"
                    required
                    placeholder="MH-14-GX-XXXX"
                    value={newVehicleReg}
                    onChange={(e) => setNewVehicleReg(e.target.value)}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300] outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Assigned Driver (Primary)</label>
                  <select
                    value={newVehicleDriver}
                    onChange={(e) => setNewVehicleDriver(e.target.value)}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300] outline-none"
                  >
                    <option value="">-- Choose Driver --</option>
                    {employees.filter(emp => emp.Role.includes("Driver") || emp.Department === "Logistics").map(emp => (
                      <option key={emp.Id} value={emp.Id}>{emp.Name} ({emp.Role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Max Case Volume Capacity</label>
                  <input
                    type="number"
                    value={newVehicleCapacity}
                    onChange={(e) => setNewVehicleCapacity(Number(e.target.value))}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300] outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleForm(false)}
                  className="px-4 py-2 border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-[#ffb300] text-black font-bold uppercase rounded-lg"
                >
                  Confirm Registry Addition
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map((v, idx) => (
              <div key={v.Id} className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 hover:border-[#ffb300]/40 transition duration-300 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-[#ffb300]">
                  <Truck size={45} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">FMCG DELIVERY CARRIER</span>
                      <h4 className="text-md font-bold text-white uppercase mt-0.5">{v.Name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono tracking-wider border ${
                      v.Status === "Active" || v.Status === "At-warehouse" 
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" 
                        : v.Status === "In-field" 
                        ? "bg-[#ffb300]/15 border-[#ffb300]/30 text-amber-glow" 
                        : "bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse"
                    }`}>
                      {v.Status}
                    </span>
                  </div>

                  <ul className="space-y-2 text-[11px] font-mono text-zinc-400 pb-4">
                    <li className="flex justify-between">
                      <span>Registration Plate:</span>
                      <strong className="text-white">{v.RegistrationNumber}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Cargo Volume Limit:</span>
                      <strong className="text-zinc-200">{v.LoadCapacityCases} Cases max</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Assigned Logistics:</span>
                      <strong className="text-amber-glow">{employeeMap.get(v.PrimaryDriverId) || "Ramesh Shinde"}</strong>
                    </li>
                  </ul>
                </div>

                <div className="border-t border-zinc-850 pt-3 mt-1 flex items-center justify-between">
                  <span className="text-[9px] text-zinc-550 italic font-mono">ID: {v.Id}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newStatus = v.Status === "Breakdown" ? "At-warehouse" : "Breakdown";
                        onUpdateVehicles(prev => prev.map(item => item.Id === v.Id ? { ...item, Status: newStatus as any } : item));
                        alert(`Vehicle "${v.Name}" marked as ${newStatus === "Breakdown" ? "DOWN WITH CRITICAL MECHANICAL FAULT (Breakdown alert raised)" : "Active/Operational"}.`);
                      }}
                      className={`px-2 py-1 rounded text-[9px] font-bold border transition cursor-pointer font-mono ${
                        v.Status === "Breakdown" 
                          ? "bg-[#10b981]/10 border-[#10b981]/30 hover:border-emerald-400 text-[#10b981]" 
                          : "bg-red-500/5 border-red-500/20 text-red-400 hover:border-red-400"
                      }`}
                    >
                      {v.Status === "Breakdown" ? "Clear Breakdown" : "Trigger Breakdown"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#0b0c10]/40 border border-zinc-850 p-4.5 rounded-xl flex items-center space-x-3 text-xs text-zinc-400">
            <Info size={14} className="text-[#ffb300]" />
            <span>
              <strong>Highway Beats Security Protocol:</strong> Sinhalese drivers are required by office dispatch terms to log odometer readings every evening. Any unexpected fuel variances are registered dynamically inside the Operational expenses sheet.
            </span>
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: WAREHOUSE GODOWNS */}
      {activeSubTab === "warehouses" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#ffb300] font-mono">🏢 CONNECTED PHYSICAL CENTRAL WAREHOUSES</h3>
            <button
              onClick={() => setShowAddWarehouseForm(!showAddWarehouseForm)}
              className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 px-4.5 py-1.5 rounded-xl text-xs font-bold text-amber-glow transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Register New Warehouse Node</span>
            </button>
          </div>

          {showAddWarehouseForm && (
            <form onSubmit={handleAddWarehouse} className="bg-zinc-950 border border-[#ffb300]/20 p-5 rounded-xl space-y-4 animate-fade-in pb-6 max-w-xl">
              <h4 className="text-xs uppercase font-mono font-black text-amber-glow">Add central godown warehouse specifications</h4>
              <div className="grid grid-cols-1 gap-3 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1">Godown Identifier (e.g. Warehouse 3 - Chakan Depo)</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter warehouse name"
                    value={newWhName}
                    onChange={(e) => setNewWhName(e.target.value)}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Physical Address / Gate Location</label>
                  <input
                    type="text"
                    required
                    placeholder="Industrial Area plot reference, Pune"
                    value={newWhLoc}
                    onChange={(e) => setNewWhLoc(e.target.value)}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300] outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Maximum Stock Capacity Limit (Cases)</label>
                  <input
                    type="number"
                    value={newWhCapacity}
                    onChange={(e) => setNewWhCapacity(Number(e.target.value))}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300] outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddWarehouseForm(false)}
                  className="px-4 py-2 border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-[#ffb300] text-black font-bold uppercase rounded-lg"
                >
                  Register Godown Node
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map(w => (
              <div key={w.Id} className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 hover:border-[#ffb300]/40 transition duration-300 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b border-zinc-900 pb-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">CENTRAL INVENTORY DEPOT</span>
                      <h4 className="text-sm font-bold text-amber-glow mt-0.5">{w.Name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono tracking-wider border bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
                      {w.Status}
                    </span>
                  </div>

                  <div className="space-y-2 text-[11px] text-zinc-400 font-mono">
                    <p className="flex items-start">
                      <MapPin size={12} className="text-[#ffb300] mr-1.5 shrink-0 mt-0.5" />
                      <span>{w.Location}</span>
                    </p>
                    <div className="flex justify-between border-t border-zinc-900/65 pt-2">
                      <span>Maximum Storage Cap:</span>
                      <strong className="text-zinc-100">{w.CapacityCases.toLocaleString()} Cases</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Assigned Staff Member:</span>
                      <strong className="text-white">Ramesh Patil (Chief Handler)</strong>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-850 pt-3 mt-4 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-550 font-mono">Node ID: {w.Id}</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">Authorized Godown</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-PANEL 3: SUPPLIER CREDIT NOTES */}
      {activeSubTab === "credit-notes" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#ffb300] font-mono">🧾 SUPPLIER CREDIT NOTES (MARKET RETURNS EXPIRED ADJUSTMENT)</h3>
            <button
              onClick={() => setShowAddCreditNoteForm(!showAddCreditNoteForm)}
              className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 px-4.5 py-1.5 rounded-xl text-xs font-bold text-amber-glow transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Raise Supplier Credit Note</span>
            </button>
          </div>

          {showAddCreditNoteForm && (
            <form onSubmit={handleAddCreditNote} className="bg-zinc-950 border border-[#ffb300]/20 p-5 rounded-xl space-y-4 animate-fade-in pb-6 max-w-xl text-xs">
              <h4 className="text-xs uppercase font-mono font-black text-amber-glow">Record credit certificate from FMCG Manufacturer</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Select Supplier</label>
                  <select
                    value={scnSupplierCode}
                    onChange={(e) => setScnSupplierCode(e.target.value)}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300]"
                  >
                    <option value="">-- Choose Manufacturer --</option>
                    {suppliers.map(s => (
                      <option key={s.Supplier_Code} value={s.Supplier_Code}>{s.Supplier_Name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Note Credit refund Value (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter Rs amount"
                    value={scnCreditAmt || ""}
                    onChange={(e) => setScnCreditAmt(Number(e.target.value))}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300] font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Select Return SKU Category Item</label>
                  <select
                    value={scnReturnSku}
                    onChange={(e) => setScnReturnSku(e.target.value)}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300]"
                  >
                    <option value="">-- Choose Product SKU --</option>
                    {PRODUCTS.filter(p => !scnSupplierCode || p.Supplier_Code === scnSupplierCode).map(p => (
                      <option key={p.Item_Code} value={p.Item_Code}>{getSimplifiedProductName(p.Item_Name)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Returned Cases Quantity</label>
                  <input
                    type="number"
                    value={scnReturnCases}
                    onChange={(e) => setScnReturnCases(Number(e.target.value))}
                    className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300]"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Defect Code / Return Reason</label>
                  <select
                    value={scnReturnReason}
                    onChange={(e) => setScnReturnReason(e.target.value as any)}
                    className="w-full bg-[#0d0f13] text-[#ebf1fa] border border-zinc-800 p-2 rounded focus:border-[#ffb300]"
                  >
                    <option value="Expired">Expired stocks from general trade</option>
                    <option value="Damaged">Transit breakage / damages</option>
                    <option value="Excess Supply">Excess factory supply error</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-zinc-400 block mb-1 text-xs">Remarks / Factory Ledger Adjustments Details</label>
                <textarea
                  placeholder="Processed notes..."
                  value={scnNotes}
                  onChange={(e) => setScnNotes(e.target.value)}
                  className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300]"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddCreditNoteForm(false)}
                  className="px-4 py-2 border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-[#ffb300] text-black font-bold uppercase rounded-lg"
                >
                  Record Credit Note
                </button>
              </div>
            </form>
          )}

          <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-900 text-zinc-400 uppercase text-[10px]">
                    <th className="p-4">Certificate ID</th>
                    <th className="p-4">Credited Supplier Partner</th>
                    <th className="p-4">Register Date</th>
                    <th className="p-4">Returned Item Detail</th>
                    <th className="p-4">Cases</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4 text-right">Refund Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {supplierCreditNotes.map(scn => (
                    <tr key={scn.Id} className="hover:bg-zinc-900/40 table-row-hover">
                      <td className="p-4 font-bold text-amber-glow">{scn.Id}</td>
                      <td className="p-4 font-sans font-bold text-white max-w-xs truncate">{scn.SupplierName}</td>
                      <td className="p-4 text-zinc-400">{scn.Date}</td>
                      <td className="p-4 text-zinc-400 max-w-xs truncate">
                        {getSimplifiedProductName(scn.ProductsReturned[0]?.ItemName || "Frooti Cases")}
                      </td>
                      <td className="p-4 text-zinc-200">{scn.ProductsReturned[0]?.QuantityCases || 10}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-450 border border-zinc-850 text-[10px]">
                          {scn.ProductsReturned[0]?.Reason || "Expired"}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400">
                        ₹{scn.CreditAmount.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold border ${
                          scn.Status === "Settled" || scn.Status === "Applied"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-amber-300/10 border-amber-300/25 text-amber-glow animate-pulse"
                        }`}>
                          {scn.Status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {scn.Status === "Pending" ? (
                          <button
                            onClick={() => {
                              onUpdateSupplierCreditNotes(prev => prev.map(item => item.Id === scn.Id ? { ...item, Status: "Settled" } : item));
                              alert(`Credit Note "${scn.Id}" marked as SETTLED to supplier ledger accounts balance reduction.`);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-1 rounded text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Mark Settled
                          </button>
                        ) : (
                          <span className="text-zinc-550 text-[10px] italic">No Action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
