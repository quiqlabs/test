"use client";

import { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "day",
  WEEKLY: "week",
  MONTHLY: "month",
  YEARLY: "year",
};

export default function RecurrencePicker() {
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [endType, setEndType] = useState("NEVER");
  const [endAfterCount, setEndAfterCount] = useState(10);
  const [endDate, setEndDate] = useState("");

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  if (!enabled) {
    return (
      <div className="md:col-span-6">
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          + Add recurrence
        </button>
        <input type="hidden" name="recurrenceFrequency" value="" />
      </div>
    );
  }

  const unitLabel = FREQUENCY_LABELS[frequency] ?? "day";
  const pluralUnit = interval > 1 ? `${unitLabel}s` : unitLabel;

  return (
    <div className="md:col-span-6 rounded-md border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Recurrence</h3>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Remove
        </button>
      </div>

      {/* Frequency + Interval */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-600">Every</span>
        <input
          type="number"
          min={1}
          max={99}
          value={interval}
          onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
          className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="DAILY">{interval > 1 ? "days" : "day"}</option>
          <option value="WEEKLY">{interval > 1 ? "weeks" : "week"}</option>
          <option value="MONTHLY">{interval > 1 ? "months" : "month"}</option>
          <option value="YEARLY">{interval > 1 ? "years" : "year"}</option>
        </select>
      </div>

      {/* Days of week (WEEKLY only) */}
      {frequency === "WEEKLY" && (
        <div>
          <p className="mb-2 text-sm text-slate-600">Repeat on</p>
          <div className="flex gap-1">
            {DAYS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(index)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  daysOfWeek.includes(index)
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* End condition */}
      <div>
        <p className="mb-2 text-sm text-slate-600">Ends</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="endTypeRadio"
              checked={endType === "NEVER"}
              onChange={() => setEndType("NEVER")}
              className="accent-emerald-600"
            />
            Never
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="endTypeRadio"
              checked={endType === "AFTER_COUNT"}
              onChange={() => setEndType("AFTER_COUNT")}
              className="accent-emerald-600"
            />
            After
            <input
              type="number"
              min={1}
              max={365}
              value={endAfterCount}
              onChange={(e) => setEndAfterCount(Math.max(1, Number(e.target.value)))}
              disabled={endType !== "AFTER_COUNT"}
              className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
            />
            occurrences
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="endTypeRadio"
              checked={endType === "ON_DATE"}
              onChange={() => setEndType("ON_DATE")}
              className="accent-emerald-600"
            />
            On date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={endType !== "ON_DATE"}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Repeats every {interval > 1 ? `${interval} ` : ""}{pluralUnit}
        {frequency === "WEEKLY" && daysOfWeek.length > 0
          ? ` on ${daysOfWeek.map((d) => DAYS[d]).join(", ")}`
          : ""}
        {endType === "AFTER_COUNT" ? `, ${endAfterCount} times` : ""}
        {endType === "ON_DATE" && endDate ? `, until ${endDate}` : ""}
        {endType === "NEVER" ? ", no end date" : ""}
      </p>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="recurrenceFrequency" value={frequency} />
      <input type="hidden" name="recurrenceInterval" value={String(interval)} />
      <input type="hidden" name="recurrenceDaysOfWeek" value={daysOfWeek.join(",")} />
      <input type="hidden" name="recurrenceEndType" value={endType} />
      <input type="hidden" name="recurrenceEndAfterCount" value={String(endAfterCount)} />
      <input type="hidden" name="recurrenceEndDate" value={endDate} />
    </div>
  );
}
