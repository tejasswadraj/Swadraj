/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Employee, AdvanceRecord, PayrollRecord } from "../types";
import { 
  Users, 
  Wallet, 
  History, 
  Plus, 
  Trash2, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Banknote,
  Calendar,
  CreditCard,
  UserPlus
} from "lucide-react";

interface PayrollManagementProps {
  employees: Employee[];
  advances: AdvanceRecord[];
  payrollRecords: PayrollRecord[];
  attendanceLog: any[];
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateAdvances: (advances: AdvanceRecord[]) => void;
  onUpdatePayroll: (records: PayrollRecord[]) => void;
}

export default function PayrollManagement({
  employees,
  advances,
  payrollRecords,
  attendanceLog,
  onUpdateEmployees,
  onUpdateAdvances,
  onUpdatePayroll
}: PayrollManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<"master" | "advances" | "payroll">("payroll");
  const [searchTerm, setSearchTerm] = useState("");

  // Employee Master Form
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    Department: "Logistics",
    Status: "Active",
    JoiningDate: new Date().toISOString().split("T")[0]
  });

  // Advance Form
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [newAdvance, setNewAdvance] = useState<Partial<AdvanceRecord>>({
    Date: new Date().toISOString().split("T")[0],
    Status: "Pending"
  });

  // Payroll Run Form
  const [selectedMonth, setSelectedMonth] = useState("June");
  const [selectedYear, setSelectedYear] = useState(2026);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.Role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const employee: Employee = {
      Id: `emp_${Date.now()}`,
      Name: newEmployee.Name || "",
      Role: newEmployee.Role || "",
      Department: newEmployee.Department as any || "Logistics",
      JoiningDate: newEmployee.JoiningDate || "",
      StandardDailyWage: newEmployee.StandardDailyWage || 0,
      Status: "Active",
      ...newEmployee
    } as Employee;

    onUpdateEmployees([...employees, employee]);
    setShowEmployeeModal(false);
    setNewEmployee({
      Department: "Logistics",
      Status: "Active",
      JoiningDate: new Date().toISOString().split("T")[0]
    });
  };

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const advance: AdvanceRecord = {
      Id: `adv_${Date.now()}`,
      EmployeeId: newAdvance.EmployeeId || "",
      Amount: newAdvance.Amount || 0,
      Date: newAdvance.Date || "",
      Reason: newAdvance.Reason || "",
      Status: "Pending"
    };

    onUpdateAdvances([...advances, advance]);
    setShowAdvanceModal(false);
    setNewAdvance({
      Date: new Date().toISOString().split("T")[0],
      Status: "Pending"
    });
  };

  // Helper to calculate summary stats
  const stats = useMemo(() => {
    const totalAdvances = advances
      .filter(a => a.Status === "Pending")
      .reduce((sum, a) => sum + a.Amount, 0);
    
    const activeStaff = employees.filter(e => e.Status === "Active").length;
    
    const monthlyWages = payrollRecords
      .filter(p => p.Month === `${selectedMonth} ${selectedYear}`)
      .reduce((sum, p) => sum + p.NetPayout, 0);

    return { totalAdvances, activeStaff, monthlyWages };
  }, [advances, employees, payrollRecords, selectedMonth, selectedYear]);

  return (
    <div className="space-y-6 animate-fade-in font-sans text-zinc-300">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d0f13] border border-zinc-800 p-6 rounded-2xl shadow-xl">
        <div>
          <span className="text-[10px] text-amber-glow uppercase tracking-widest font-mono font-bold block">Human Capital & Payroll Node</span>
          <h1 className="text-xl font-bold tracking-tight text-white mt-0.5 uppercase font-tech">Staff & Compensation Management</h1>
          <p className="text-zinc-500 text-xs mt-1">
            Managing employee rosters, operational advances, and monthly salary disbursements.
          </p>
        </div>

        <div className="flex gap-2">
          {activeSubTab === "master" && (
            <button
              onClick={() => setShowEmployeeModal(true)}
              className="px-4 py-2 bg-amber-glow hover:bg-[#ffb300] text-black font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg font-mono uppercase"
            >
              <UserPlus size={14} />
              Add Employee
            </button>
          )}
          {activeSubTab === "advances" && (
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg font-mono uppercase"
            >
              <Plus size={14} />
              Issue Advance
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0e1014] border border-zinc-850 p-5 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500">Active Workforce</span>
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.activeStaff} Staff Members</div>
          <div className="text-[9px] text-zinc-500 uppercase">Operational registered employees</div>
        </div>

        <div className="bg-[#0e1014] border border-zinc-850 p-5 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500">Total Pending Advances</span>
            <Wallet size={16} className="text-amber-glow" />
          </div>
          <div className="text-2xl font-bold text-amber-glow">₹{stats.totalAdvances.toLocaleString()}</div>
          <div className="text-[9px] text-zinc-505 uppercase">Outbound employee credit exposure</div>
        </div>

        <div className="bg-[#0e1014] border border-zinc-850 p-5 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500">Net Payroll ({selectedMonth})</span>
            <Banknote size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">₹{stats.monthlyWages.toLocaleString()}</div>
          <div className="text-[9px] text-emerald-600 uppercase">Processed disbursements this period</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-850 mb-6">
        <button
          onClick={() => setActiveSubTab("payroll")}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer border-b-2 ${
            activeSubTab === "payroll" ? "border-amber-glow text-amber-glow" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Monthly Payroll
        </button>
        <button
          onClick={() => setActiveSubTab("advances")}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer border-b-2 ${
            activeSubTab === "advances" ? "border-amber-glow text-amber-glow" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Advance Tracker
        </button>
        <button
          onClick={() => setActiveSubTab("master")}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer border-b-2 ${
            activeSubTab === "master" ? "border-amber-glow text-amber-glow" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Employee Master
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {activeSubTab === "master" && (
          <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search staff name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-[11px] text-white focus:border-amber-glow outline-none transition"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 font-bold h-10 border-b border-zinc-850 uppercase text-[9px] tracking-widest">
                    <th className="p-4">Employee Details</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Daily Wage</th>
                    <th className="p-4">Joining Date</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.Id} className="hover:bg-zinc-900/50 group transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold uppercase border border-zinc-700">
                            {emp.Name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-white font-bold block">{emp.Name}</span>
                            <span className="text-[9px] text-zinc-500 uppercase font-mono">{emp.Role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 uppercase text-[10px] font-mono text-zinc-400">{emp.Department}</td>
                      <td className="p-4 font-mono font-bold text-amber-glow-light">₹{emp.StandardDailyWage.toLocaleString()}</td>
                      <td className="p-4 font-mono text-zinc-500">{emp.JoiningDate}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          emp.Status === "Active" ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" : "bg-zinc-950 text-zinc-500 border-zinc-800"
                        }`}>
                          {emp.Status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-550 hover:text-white transition cursor-pointer">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "advances" && (
          <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 font-bold h-10 border-b border-zinc-850 uppercase text-[9px] tracking-widest">
                    <th className="p-4">Staff Name</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Advance Amount</th>
                    <th className="p-4">Reason / Notes</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {advances.map(adv => {
                    const emp = employees.find(e => e.Id === adv.EmployeeId);
                    return (
                      <tr key={adv.Id} className="hover:bg-zinc-900/50 group transition">
                        <td className="p-4 font-bold text-white uppercase">{emp?.Name || "Deleted Employee"}</td>
                        <td className="p-4 font-mono text-zinc-500">{adv.Date}</td>
                        <td className="p-4 font-mono font-bold text-rose-455">₹{adv.Amount.toLocaleString()}</td>
                        <td className="p-4 italic text-zinc-400">{adv.Reason}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            adv.Status === "Pending" ? "bg-amber-950/30 text-amber-glow border-amber-900/40" : 
                            adv.Status === "Deducted" ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" : "bg-zinc-950 text-zinc-500 border-zinc-800"
                          }`}>
                            {adv.Status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {adv.Status === "Pending" && (
                            <button className="p-2 hover:bg-zinc-800 rounded-lg text-rose-500 transition cursor-pointer">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {advances.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-zinc-500 italic">No employee advances currently active in ledger.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "payroll" && (
          <div className="space-y-6">
            {/* Period Selection */}
            <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-zinc-500" />
                <span className="text-xs font-bold uppercase tracking-tight">Active Period:</span>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer"
              >
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              
              <button 
                className="ml-auto px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] rounded-lg transition uppercase font-mono tracking-wider shadow-lg"
                onClick={() => alert("Calculating current period payroll...")}
              >
                Process {selectedMonth} Payroll
              </button>
            </div>

            {/* Payroll Grid */}
            <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-400 font-bold h-10 border-b border-zinc-850 uppercase text-[9px] tracking-widest">
                      <th className="p-4">Staff Name</th>
                      <th className="p-4 text-center">Attendance (P/H/A)</th>
                      <th className="p-4 text-right">Gross Wages</th>
                      <th className="p-4 text-right text-rose-400">Advance Ded.</th>
                      <th className="p-4 text-right text-emerald-400 font-black">Net Payout</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {employees.map(emp => {
                      // Mock calculation for demo purposes
                      const present = 24;
                      const half = 2;
                      const absent = 4;
                      const gross = (present * emp.StandardDailyWage) + (half * emp.StandardDailyWage * 0.5);
                      const pendingAdvance = advances.find(a => a.EmployeeId === emp.Id && a.Status === "Pending")?.Amount || 0;
                      const net = gross - pendingAdvance;

                      return (
                        <tr key={emp.Id} className="hover:bg-zinc-900/50 transition">
                          <td className="p-4">
                            <strong className="text-white block uppercase">{emp.Name}</strong>
                            <span className="text-[10px] text-zinc-500 font-mono font-bold">RATE: ₹{emp.StandardDailyWage}/day</span>
                          </td>
                          <td className="p-4 text-center font-mono">
                            <span className="text-emerald-400">{present}P</span> / <span className="text-indigo-400">{half}H</span> / <span className="text-rose-455">{absent}A</span>
                          </td>
                          <td className="p-4 text-right font-mono font-bold">₹{gross.toLocaleString()}</td>
                          <td className="p-4 text-right font-mono font-bold text-rose-400">-₹{pendingAdvance.toLocaleString()}</td>
                          <td className="p-4 text-right font-mono font-black text-emerald-400 text-sm">₹{net.toLocaleString()}</td>
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full text-[9px] font-bold uppercase">Draft</span>
                          </td>
                          <td className="p-4 text-center">
                            <button className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-amber-glow text-zinc-500 hover:text-amber-glow transition cursor-pointer">
                              <CreditCard size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0f13] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-zinc-850 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Add New Team Member</h3>
              <button onClick={() => setShowEmployeeModal(false)} className="text-zinc-500 hover:text-white transition">
                <Trash2 size={16} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.Name}
                    onChange={(e) => setNewEmployee({...newEmployee, Name: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-amber-glow/50"
                    placeholder="Enter full name..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Role</label>
                    <input
                      type="text"
                      required
                      value={newEmployee.Role}
                      onChange={(e) => setNewEmployee({...newEmployee, Role: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-amber-glow/50"
                      placeholder="e.g. Driver"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Standard Wage (₹)</label>
                    <input
                      type="number"
                      required
                      value={newEmployee.StandardDailyWage || ""}
                      onChange={(e) => setNewEmployee({...newEmployee, StandardDailyWage: parseInt(e.target.value)})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-amber-glow/50"
                      placeholder="800"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Department</label>
                  <select
                    value={newEmployee.Department}
                    onChange={(e) => setNewEmployee({...newEmployee, Department: e.target.value as any})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none cursor-pointer"
                  >
                    <option value="Logistics">Logistics (Route Drivers)</option>
                    <option value="Warehouse">Warehouse (Loaders)</option>
                    <option value="Admin">Administration</option>
                    <option value="Sales">Sales Force</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-amber-glow hover:bg-[#ffb300] text-black font-extrabold py-3 rounded-xl transition uppercase tracking-widest text-xs mt-4"
              >
                Register Employee Node
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0f13] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-zinc-850 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Issue Employee Advance</h3>
              <button onClick={() => setShowAdvanceModal(false)} className="text-zinc-500 hover:text-white transition">
                <Trash2 size={16} />
              </button>
            </div>
            <form onSubmit={handleAddAdvance} className="p-6 space-y-4">
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Select Employee</label>
                  <select
                    required
                    value={newAdvance.EmployeeId}
                    onChange={(e) => setNewAdvance({...newAdvance, EmployeeId: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none cursor-pointer"
                  >
                    <option value="">Choose staff member...</option>
                    {employees.map(emp => (
                      <option key={emp.Id} value={emp.Id}>{emp.Name} ({emp.Role})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Advance Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={newAdvance.Amount || ""}
                      onChange={(e) => setNewAdvance({...newAdvance, Amount: parseInt(e.target.value)})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-amber-glow/50"
                      placeholder="e.g. 5000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Issue Date</label>
                    <input
                      type="date"
                      required
                      value={newAdvance.Date}
                      onChange={(e) => setNewAdvance({...newAdvance, Date: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Reason / Notes</label>
                  <textarea
                    required
                    value={newAdvance.Reason}
                    onChange={(e) => setNewAdvance({...newAdvance, Reason: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none h-20 resize-none placeholder-zinc-700"
                    placeholder="Briefly explain payout reason..."
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-xl transition uppercase tracking-widest text-xs mt-4"
              >
                Confirm Advance Issue
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
