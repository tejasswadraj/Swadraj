/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileSpreadsheet, 
  Plus, 
  Sparkles,
  Pocket,
  Printer
} from "lucide-react";

interface AttendanceRecord {
  name: string;
  role: string;
  date: string;
  status: "Present" | "Absent" | "Half-Day" | "On Leave";
  hours: number;
  notes: string;
}

interface AttendanceReportProps {
  attendanceLog: AttendanceRecord[];
  onLogAttendance: (record: AttendanceRecord) => void;
  selectedDate: string;
}

const EMPLOYEES = [
  { name: "Ramesh Shinde", role: "Driver (Sinhgad)", standardWage: 800 },
  { name: "Sunil Patil", role: "Driver (Rajgad)", standardWage: 800 },
  { name: "Sachin Yadav", role: "Driver (Purandar)", standardWage: 800 },
  { name: "Ramesh Patil", role: "Warehouse Handler", standardWage: 600 },
  { name: "Amit K.", role: "Admin Clerk", standardWage: 700 }
];

export default function AttendanceReport({
  attendanceLog,
  onLogAttendance,
  selectedDate
}: AttendanceReportProps) {
  // Local state for active calendar date view
  const [targetDate, setTargetDate] = useState<string>(selectedDate || "2026-06-14");
  const [filterRole, setFilterRole] = useState<string>("All");

  // Input states for new logs
  const [selectedEmp, setSelectedEmp] = useState<string>(EMPLOYEES[0].name);
  const [statusVal, setStatusVal] = useState<"Present" | "Absent" | "Half-Day" | "On Leave">("Present");
  const [hoursVal, setHoursVal] = useState<number>(12);
  const [notesVal, setNotesVal] = useState<string>("");

  // Filter records for the clicked date
  const filteredRecords = useMemo(() => {
    return attendanceLog.filter(rec => {
      const matchDate = rec.date === targetDate;
      const matchRole = filterRole === "All" || rec.role === filterRole;
      return matchDate && matchRole;
    });
  }, [attendanceLog, targetDate, filterRole]);

  // Aggregate stats across the entire active month (June 2026)
  const monthlyStats = useMemo(() => {
    const summary: Record<string, { present: number; absent: number; half: number; totalDays: number; earned: number }> = {};
    
    EMPLOYEES.forEach(e => {
      summary[e.name] = { present: 0, absent: 0, half: 0, totalDays: 0, earned: 0 };
    });

    attendanceLog.forEach(rec => {
      if (summary[rec.name]) {
        summary[rec.name].totalDays += 1;
        const empRef = EMPLOYEES.find(e => e.name === rec.name);
        const dailyRate = empRef ? empRef.standardWage : 600;

        if (rec.status === "Present") {
          summary[rec.name].present += 1;
          summary[rec.name].earned += dailyRate;
        } else if (rec.status === "Half-Day") {
          summary[rec.name].half += 1;
          summary[rec.name].earned += dailyRate * 0.5;
        } else if (rec.status === "Absent") {
          summary[rec.name].absent += 1;
        }
      }
    });

    return summary;
  }, [attendanceLog]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const empRef = EMPLOYEES.find(emp => emp.name === selectedEmp);
    if (!empRef) return;

    onLogAttendance({
      name: selectedEmp,
      role: empRef.role,
      date: targetDate,
      status: statusVal,
      hours: hoursVal,
      notes: notesVal || "Daily payroll sweep"
    });

    setNotesVal("");
    alert(`Success: Attendance registered for ${selectedEmp} on ${targetDate}!`);
  };

  const handleApplyPreset = () => {
    // Bulk log Present for all employees for the day who are not yet logged
    EMPLOYEES.forEach(emp => {
      const exists = attendanceLog.some(r => r.name === emp.name && r.date === targetDate);
      if (!exists) {
        onLogAttendance({
          name: emp.name,
          role: emp.role,
          date: targetDate,
          status: "Present",
          hours: emp.role.includes("Driver") ? 12 : 8,
          notes: "Standard operational shift preset"
        });
      }
    });
    alert(`Roster preset applied: Marked remaining team present on ${targetDate}!`);
  };

  return (
    <div className="space-y-6" id="attendance-report-tab">
      
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total staff present */}
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-zinc-400 font-semibold text-xs tracking-wider uppercase">Active Staff Roster</span>
          <div className="mt-3 flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black font-sans text-amber-glow-light">
                {EMPLOYEES.length} Employees
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Drivers & logistics handlers registered</p>
            </div>
            <Users size={22} className="text-amber-glow" />
          </div>
        </div>

        {/* Daily Presence count */}
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-zinc-400 font-semibold text-xs tracking-wider uppercase">Today Presence Count</span>
          <div className="mt-3 flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black font-sans text-emerald-400">
                {filteredRecords.filter(r => r.status === "Present" || r.status === "Half-Day").length} / {EMPLOYEES.length}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Present on date {targetDate}</p>
            </div>
            <CheckCircle size={22} className="text-emerald-400" />
          </div>
        </div>

        {/* Aggregate Wages logged */}
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-zinc-400 font-semibold text-xs tracking-wider uppercase text-amber-glow">Estimated Wages Run (₹)</span>
          <div className="mt-3 flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black font-mono text-white">
                ₹{Object.values(monthlyStats).reduce((sum: number, item: any) => sum + item.earned, 0).toLocaleString()}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Accumulated month-to-date wages</p>
            </div>
            <Pocket size={22} className="text-[#ffb300]" />
          </div>
        </div>

        {/* Absences tracked */}
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-zinc-400 font-semibold text-xs tracking-wider uppercase text-rose-455">Absences Noted</span>
          <div className="mt-3 flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black font-sans text-rose-400">
                {filteredRecords.filter(r => r.status === "Absent").length} Days
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Staff absent on date {targetDate}</p>
            </div>
            <XCircle size={22} className="text-rose-400" />
          </div>
        </div>
      </div>

      {/* Date controls and manual entry layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance logger Form */}
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-6 shadow-md text-white space-y-4">
          <div className="border-b border-zinc-850 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-glow uppercase tracking-wider font-mono">
              🖊️ Register Log Entry
            </h3>
            <button
              onClick={handleApplyPreset}
              className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 font-bold uppercase tracking-wider px-2 py-1 rounded text-amber-glow cursor-pointer transition"
              title="Add 'Present' standard logs for all workers"
            >
              Apply All-Present Preset
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1 font-mono uppercase tracking-tight text-[10px]">Select Employee</label>
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl p-2.5 text-xs text-white outline-none cursor-pointer"
              >
                {EMPLOYEES.map(emp => (
                  <option key={emp.name} value={emp.name}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1 font-mono uppercase tracking-tight text-[10px]">Duty Status</label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl p-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="Present">Present (Full Pay)</option>
                  <option value="Half-Day">Half Shift (50% Pay)</option>
                  <option value="Absent">Absent (0 Pay)</option>
                  <option value="On Leave">Approved Leave</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-mono uppercase tracking-tight text-[10px]">Logged Flight Hours</label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={hoursVal}
                  onChange={(e) => setHoursVal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-mono uppercase tracking-tight text-[10px]">Remarks / Shifts Notes</label>
              <input
                type="text"
                value={notesVal}
                placeholder="e.g. Completed Sinhgad route delivery"
                onChange={(e) => setNotesVal(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl p-2.5 text-xs text-white outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#ffb300] hover:bg-amber-500 transition font-extrabold text-zinc-950 py-2.5 rounded-xl cursor-pointer font-sans"
            >
              Sign Daily Log Entry
            </button>
          </form>
        </div>

        {/* Center: Daily Attendance list table */}
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-6 shadow-md text-white space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-850 pb-3">
            <div>
              <h3 className="text-xs font-bold text-amber-glow uppercase tracking-wider font-mono">
                📅 Daily Roster Log Details
              </h3>
              <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Auditing attendance cards for operational shift execution</p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-zinc-950 text-white rounded-xl py-1.5 px-3 border border-zinc-750 text-xs font-mono focus:border-amber-glow outline-none cursor-pointer"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-zinc-950 text-white rounded-xl py-1.5 px-3 border border-zinc-750 text-xs font-sans focus:border-amber-glow outline-none cursor-pointer"
              >
                <option value="All">All Staff</option>
                <option value="Driver (Sinhgad)">Sinhgad</option>
                <option value="Driver (Rajgad)">Rajgad</option>
                <option value="Driver (Purandar)">Purandar</option>
                <option value="Warehouse Handler">Warehouse</option>
                <option value="Admin Clerk">Admin Office</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-805 text-zinc-400 uppercase font-mono text-[9px]">
                  <th className="py-2.5">Team Member</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5 text-center">Status Badge</th>
                  <th className="py-2.5 text-center">Duration (Hrs)</th>
                  <th className="py-2.5">Shift Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-sans text-zinc-350">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-550 italic font-mono">
                      No attendance logged for {targetDate}. Use preset above or add a manual log card.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-zinc-950/40">
                      <td className="py-3 font-bold text-white uppercase">
                        {rec.name}
                        <span className="text-[9px] text-zinc-500 block font-bold font-mono lowercase">{rec.role}</span>
                      </td>
                      <td className="py-3 font-mono text-zinc-400">{rec.date}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border font-sans ${
                          rec.status === "Present" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900" :
                          rec.status === "Half-Day" ? "bg-indigo-950/40 text-indigo-400 border-indigo-900" :
                          rec.status === "Absent" ? "bg-rose-950/40 text-rose-455 border-rose-900" :
                          "bg-zinc-950 text-zinc-400 border-zinc-800"
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-white">{rec.hours} Hrs</td>
                      <td className="py-3 text-zinc-400 italic font-mono text-[11px] truncate max-w-[150px]" title={rec.notes}>{rec.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Monthly Accumulations & Payroll Estimate Roster */}
      <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-6 shadow-md text-white space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 select-none">
          <div>
            <h3 className="text-xs font-bold text-amber-glow uppercase tracking-wider font-mono">
              📊 Aggregate Monthly Team Wage & Strength Ledger (June 2026)
            </h3>
            <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Estimating cumulative month salaries based on registered shifts log</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1 hover:border-amber-glow hover:text-white border border-zinc-750 bg-zinc-950 font-bold font-sans text-[10px] px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
          >
            <Printer size={12} className="text-amber-glow" />
            <span>Print Pay Slips Roster</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-805 text-zinc-400 uppercase font-mono text-[9px]">
                <th className="py-2.5">Staff Name</th>
                <th className="py-2.5">Standard Rate (Daily)</th>
                <th className="py-2.5 text-center text-emerald-555">Days Present</th>
                <th className="py-2.5 text-center text-indigo-555">Days Half-Shift</th>
                <th className="py-2.5 text-center text-rose-555">Days Absent</th>
                <th className="py-2.5 text-center">Roster logged Count</th>
                <th className="py-2.5 text-right text-amber-glow">Accrued Wage Earnings (June)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-350">
              {EMPLOYEES.map((emp) => {
                const stat = monthlyStats[emp.name] || { present: 0, absent: 0, half: 0, totalDays: 0, earned: 0 };
                return (
                  <tr key={emp.name} className="hover:bg-zinc-950/40">
                    <td className="py-3">
                      <strong className="text-white block uppercase">{emp.name}</strong>
                      <span className="text-[10px] text-zinc-500 font-bold block">{emp.role}</span>
                    </td>
                    <td className="py-3 font-mono text-zinc-400 font-bold text-xs">₹{emp.standardWage.toLocaleString()} / day</td>
                    <td className="py-3 text-center font-bold text-emerald-400">{stat.present} days</td>
                    <td className="py-3 text-center text-indigo-400 font-bold">{stat.half} days</td>
                    <td className="py-3 text-center text-rose-455 font-bold">{stat.absent} days</td>
                    <td className="py-3 text-center font-mono font-bold text-zinc-400">{stat.totalDays} records</td>
                    <td className="py-3 text-right font-black text-amber-glow text-sm font-mono">
                      ₹{stat.earned.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
