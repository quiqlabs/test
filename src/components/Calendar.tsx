"use client";

import { useState, useRef, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RecurrencePicker from "@/components/RecurrencePicker";

type CalendarView = "day" | "week" | "month";

interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  dueDate: string;
  recurrenceRuleId: string | null;
  hour: number;
  minute: number;
}

interface CalendarProps {
  monthLabel: string;
  prevMonthParam: string;
  nextMonthParam: string;
  gridDays: Array<{ date: string; inMonth: boolean }>;
  todosByDate: Record<string, TodoItem[]>;
  currentDate: string;
  categories: Array<{ id: string; name: string }>;
  createAction: (formData: FormData) => void;
  moveTodoAction: (formData: FormData) => void;
  createCategoryAction: (formData: FormData) => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Add Todo Modal ──────────────────────────────────────────────────────────
function AddTodoModal({
  date,
  categories,
  createAction,
  createCategoryAction,
  onClose,
}: {
  date: string;
  categories: Array<{ id: string; name: string }>;
  createAction: (formData: FormData) => void;
  createCategoryAction: (formData: FormData) => void;
  onClose: () => void;
}) {
  const [showNewCategory, setShowNewCategory] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Add To Do — {new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          action={(formData) => {
            createAction(formData);
            onClose();
          }}
          className="space-y-3"
        >
          <input type="hidden" name="dueDate" value={date} />
          <input
            name="title"
            type="text"
            placeholder="To do title"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            required
            autoFocus
          />
          <input
            name="description"
            type="text"
            placeholder="Description (optional)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="dueTime"
              type="time"
              defaultValue="12:00"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Category select + inline create */}
          <div>
            <div className="flex items-center gap-2">
              <select name="categoryId" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory((prev) => !prev)}
                className="shrink-0 rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-600 hover:bg-slate-50"
              >
                {showNewCategory ? "Cancel" : "+ New"}
              </button>
            </div>
            {showNewCategory && (
              <div className="mt-2 flex gap-2">
                <input
                  id="modalNewCategoryName"
                  type="text"
                  placeholder="New category name"
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("modalNewCategoryName") as HTMLInputElement;
                    const name = input?.value.trim();
                    if (!name) return;
                    const fd = new FormData();
                    fd.set("name", name);
                    createCategoryAction(fd);
                    input.value = "";
                    setShowNewCategory(false);
                  }}
                  className="shrink-0 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <RecurrencePicker />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-[#5a0a0a] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1a1a]">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Calendar ───────────────────────────────────────────────────────────
export default function Calendar({
  monthLabel,
  prevMonthParam,
  nextMonthParam,
  gridDays,
  todosByDate,
  currentDate,
  categories,
  createAction,
  moveTodoAction,
  createCategoryAction,
}: CalendarProps) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("month");
  const today = new Date(currentDate);
  const todayKey = currentDate.slice(0, 10); // YYYY-MM-DD from server's ISO string
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const dragTodoRef = useRef<TodoItem | null>(null);

  // ── Navigation helpers ──
  function getWeekDays(anchor: Date): Date[] {
    const start = new Date(anchor);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  function navigateDay(offset: number) {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + offset);
      return d;
    });
  }

  function navigateWeek(offset: number) {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + offset * 7);
      return d;
    });
  }

  const dayLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const weekDays = getWeekDays(selectedDate);
  const weekLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // ── Formatting ──
  function formatTime(hour: number, minute: number): string {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;
    const m = String(minute).padStart(2, "0");
    return `${h}:${m} ${period}`;
  }

  // ── Drag and drop (non-recurring only) ──
  function handleDragStart(e: DragEvent, todo: TodoItem) {
    if (todo.recurrenceRuleId) {
      e.preventDefault();
      return;
    }
    dragTodoRef.current = todo;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", todo.id);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: DragEvent, targetDate: string) {
    e.preventDefault();
    const todo = dragTodoRef.current;
    if (!todo) return;
    dragTodoRef.current = null;

    const currentDateKey = todo.dueDate.slice(0, 10);
    if (currentDateKey === targetDate) return;

    const fd = new FormData();
    fd.set("todoId", todo.id);
    fd.set("newDate", targetDate);
    moveTodoAction(fd);
  }

  // ── Render helpers ──
  function renderTodoChip(todo: TodoItem) {
    const timeLabel = formatTime(todo.hour, todo.minute);
    const isDraggable = !todo.recurrenceRuleId;
    return (
      <p
        key={todo.id}
        draggable={isDraggable}
        onDragStart={(e) => handleDragStart(e, todo)}
        className={`truncate rounded px-1 py-px text-[10px] ${
          todo.done ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
        } ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        title={`${timeLabel} — ${todo.title}`}
      >
        {todo.done ? "✓ " : ""}
        {todo.recurrenceRuleId ? "↻ " : ""}
        {todo.title}
      </p>
    );
  }

  function renderTodoChipWithTime(todo: TodoItem) {
    const timeLabel = formatTime(todo.hour, todo.minute);
    const isDraggable = !todo.recurrenceRuleId;
    return (
      <p
        key={todo.id}
        draggable={isDraggable}
        onDragStart={(e) => handleDragStart(e, todo)}
        className={`truncate rounded px-1 py-0.5 text-[10px] ${
          todo.done ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
        } ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        title={todo.title}
      >
        {todo.done ? "✓ " : ""}
        {todo.recurrenceRuleId ? "↻ " : ""}
        <span className="font-semibold">{timeLabel}</span>{" "}
        {todo.title}
      </p>
    );
  }

  return (
    <div>
      {/* Modal */}
      {modalDate && (
        <AddTodoModal
          date={modalDate}
          categories={categories}
          createAction={createAction}
          createCategoryAction={createCategoryAction}
          onClose={() => setModalDate(null)}
        />
      )}

      {/* View toggle + navigation */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-md border border-slate-200 p-0.5">
          {(["day", "week", "month"] as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                view === v ? "bg-[#5a0a0a] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {view === "month" ? (
            <>
              <Link href={`/todos?month=${prevMonthParam}`} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100">Prev</Link>
              <span className="font-medium text-slate-700">{monthLabel}</span>
              <Link href={`/todos?month=${nextMonthParam}`} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100">Next</Link>
            </>
          ) : view === "week" ? (
            <>
              <button type="button" onClick={() => navigateWeek(-1)} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100">Prev</button>
              <span className="font-medium text-slate-700">{weekLabel}</span>
              <button type="button" onClick={() => navigateWeek(1)} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100">Next</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => navigateDay(-1)} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100">Prev</button>
              <span className="font-medium text-slate-700">{dayLabel}</span>
              <button type="button" onClick={() => navigateDay(1)} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100">Next</button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedDate(today);
              if (view === "month") {
                const y = today.getUTCFullYear();
                const m = String(today.getUTCMonth() + 1).padStart(2, "0");
                router.push(`/todos?month=${y}-${m}`);
              }
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Month view ── */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-7 gap-px text-xs font-semibold text-slate-600">
            {DAY_LABELS.map((d) => (
              <div key={d} className="p-1 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {gridDays.map(({ date, inMonth }) => {
              const key = date;
              const dayTodos = todosByDate[key] ?? [];
              const dateObj = new Date(date + "T12:00:00");
              const isToday = key === todayKey;

              return (
                <div
                  key={`${key}-${inMonth ? "in" : "out"}`}
                  className={`min-h-16 rounded border p-1 cursor-pointer transition-colors hover:bg-slate-50 ${
                    inMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
                  } ${isToday ? "ring-2 ring-[#e6b800] ring-inset bg-[#e6b800]/10" : ""}`}
                  onClick={() => setModalDate(key)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, key)}
                >
                  <p className={`text-[11px] font-semibold ${inMonth ? "text-slate-700" : "text-slate-400"}`}>
                    {dateObj.getDate()}
                  </p>
                  <div className="mt-0.5 space-y-0.5" onClick={(e) => e.stopPropagation()}>
                    {dayTodos.slice(0, 2).map(renderTodoChip)}
                    {dayTodos.length > 2 ? (
                      <p className="text-[10px] text-slate-400">+{dayTodos.length - 2}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Week view ── */}
      {view === "week" && (
        <div className="overflow-auto">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200">
            <div className="p-1" />
            {weekDays.map((d) => {
              const key = formatDateKey(d);
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={`cursor-pointer p-1 text-center text-xs font-semibold hover:bg-slate-50 ${
                    isToday ? "text-[#5a0a0a]" : "text-slate-600"
                  }`}
                  onClick={() => setModalDate(key)}
                >
                  <span>{DAY_LABELS[d.getDay()]}</span>
                  <span className={`ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${isToday ? "bg-[#5a0a0a] text-white" : ""}`}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-100">
            <div className="p-1 text-[10px] text-slate-400">All day</div>
            {weekDays.map((d) => {
              const key = formatDateKey(d);
              const dayTodos = todosByDate[key] ?? [];
              return (
                <div
                  key={key}
                  className="min-h-12 border-l border-slate-100 p-1 space-y-0.5"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, key)}
                >
                  {dayTodos.slice(0, 4).map(renderTodoChip)}
                  {dayTodos.length > 4 ? <p className="text-[10px] text-slate-400">+{dayTodos.length - 4}</p> : null}
                </div>
              );
            })}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {hours.map((h) => (
              <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-50">
                <div className="p-1 text-right text-[10px] text-slate-400 pr-2">
                  {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                </div>
                {weekDays.map((d) => {
                  const key = formatDateKey(d);
                  const hourTodos = (todosByDate[key] ?? []).filter((t) => t.hour === h);
                  return (
                    <div
                      key={key + h}
                      className="min-h-6 border-l border-slate-50 p-px space-y-px"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, key)}
                    >
                      {hourTodos.map(renderTodoChipWithTime)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Day view ── */}
      {view === "day" && (
        <div className="overflow-auto">
          {(() => {
            const key = formatDateKey(selectedDate);
            const dayTodos = todosByDate[key] ?? [];
            return dayTodos.length > 0 ? (
              <div
                className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, key)}
              >
                <p className="text-[10px] font-semibold text-slate-500 mb-1">ALL DAY</p>
                <div className="space-y-1">
                  {dayTodos.map((todo) => (
                    <div
                      key={todo.id}
                      draggable={!todo.recurrenceRuleId}
                      onDragStart={(e) => handleDragStart(e, todo)}
                      className={`rounded-md px-2 py-1.5 text-sm ${
                        todo.done
                          ? "bg-emerald-100 text-emerald-800 line-through"
                          : "bg-white border border-slate-200 text-slate-800"
                      } ${!todo.recurrenceRuleId ? "cursor-grab active:cursor-grabbing" : ""}`}
                    >
                      <span className="font-medium text-[11px] text-slate-500 mr-1">{formatTime(todo.hour, todo.minute)}</span>
                      {todo.recurrenceRuleId ? "↻ " : ""}
                      {todo.title}
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          <div className="max-h-[500px] overflow-y-auto">
            {hours.map((h) => {
              const key = formatDateKey(selectedDate);
              const hourTodos = (todosByDate[key] ?? []).filter((t) => t.hour === h);
              return (
                <div key={h} className="flex border-b border-slate-50">
                  <div className="w-16 shrink-0 p-1 text-right text-[10px] text-slate-400 pr-2">
                    {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                  </div>
                  <div
                    className="min-h-10 flex-1 border-l border-slate-100 p-px space-y-px cursor-pointer hover:bg-slate-50/50"
                    onClick={() => setModalDate(key)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, key)}
                  >
                    {hourTodos.map(renderTodoChipWithTime)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
