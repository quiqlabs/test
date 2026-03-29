import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getSessionUserId } from "@/lib/auth";
import { generateOccurrenceDates, type RecurrenceInput } from "@/lib/recurrence";
import type { RecurrenceFrequency, RecurrenceEndType } from "@prisma/client";
import DeleteTodoButton from "@/components/DeleteTodoButton";
import Calendar from "@/components/Calendar";
import AddTodoButton from "@/components/AddTodoButton";

type TodosPageProps = {
  searchParams?: Promise<{ month?: string; view?: string }>;
};

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseMonth(value?: string): Date {
  if (!value) {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }

  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }

  return new Date(year, month - 1, 1);
}

function monthParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function daysInCalendarGrid(month: Date): Array<{ date: Date; inMonth: boolean }> {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  return userId;
}

async function createCategoryAction(formData: FormData) {
  "use server";

  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  await prisma.category.upsert({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
    update: {},
    create: {
      name,
      userId,
    },
  });

  revalidatePath("/todos");
}

async function createTodoAction(formData: FormData) {
  "use server";

  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueTimeRaw = String(formData.get("dueTime") ?? "").trim();
  const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();

  if (!title || !dueDateRaw) {
    return;
  }

  const timeStr = dueTimeRaw || "12:00";
  const dueDate = new Date(`${dueDateRaw}T${timeStr}:00.000Z`);

  if (Number.isNaN(dueDate.getTime())) {
    return;
  }

  const categoryId = categoryIdRaw || null;

  // Parse recurrence fields
  const recurrenceFrequency = String(formData.get("recurrenceFrequency") ?? "").trim();

  if (!recurrenceFrequency) {
    // No recurrence — single todo
    await prisma.todo.create({
      data: {
        title,
        description: description || null,
        dueDate,
        done: false,
        userId,
        categoryId,
      },
    });
  } else {
    const interval = Math.max(1, Number(formData.get("recurrenceInterval")) || 1);
    const daysOfWeekRaw = String(formData.get("recurrenceDaysOfWeek") ?? "");
    const daysOfWeek = daysOfWeekRaw
      ? daysOfWeekRaw.split(",").map(Number).filter((n) => !Number.isNaN(n))
      : [];
    const endType = String(formData.get("recurrenceEndType") ?? "NEVER") as RecurrenceEndType;
    const endAfterCount = Number(formData.get("recurrenceEndAfterCount")) || undefined;
    const endDateRaw = String(formData.get("recurrenceEndDate") ?? "").trim();
    const endDate = endDateRaw ? new Date(`${endDateRaw}T12:00:00.000Z`) : undefined;

    const ruleInput: RecurrenceInput = {
      frequency: recurrenceFrequency as RecurrenceFrequency,
      interval,
      daysOfWeek,
      endType,
      endAfterCount,
      endDate,
    };

    // Create the recurrence rule
    const rule = await prisma.recurrenceRule.create({
      data: {
        frequency: ruleInput.frequency,
        interval: ruleInput.interval,
        daysOfWeek: ruleInput.daysOfWeek,
        endType: ruleInput.endType,
        endAfterCount: ruleInput.endAfterCount ?? null,
        endDate: ruleInput.endDate ?? null,
      },
    });

    // Generate occurrence dates
    const occurrenceDates = generateOccurrenceDates(ruleInput, dueDate);

    // Bulk-create all todo instances
    if (occurrenceDates.length > 0) {
      await prisma.todo.createMany({
        data: occurrenceDates.map((d, i) => ({
          title,
          description: description || null,
          dueDate: d,
          done: false,
          userId,
          categoryId,
          recurrenceRuleId: rule.id,
          isRecurrenceParent: i === 0,
        })),
      });
    }
  }

  revalidatePath("/todos");
}

async function toggleTodoAction(formData: FormData) {
  "use server";

  const userId = await requireUserId();
  const todoId = String(formData.get("todoId") ?? "");
  const doneRaw = String(formData.get("done") ?? "");

  if (!todoId) {
    return;
  }

  await prisma.todo.updateMany({
    where: {
      id: todoId,
      userId,
    },
    data: {
      done: doneRaw === "true",
    },
  });

  revalidatePath("/todos");
}

async function deleteTodoAction(formData: FormData) {
  "use server";

  const userId = await requireUserId();
  const todoId = String(formData.get("todoId") ?? "");
  const mode = String(formData.get("deleteMode") ?? "single");

  if (!todoId) {
    return;
  }

  if (mode === "this_and_future") {
    // Find the todo to get its recurrence rule and due date
    const todo = await prisma.todo.findFirst({
      where: { id: todoId, userId },
    });

    if (todo?.recurrenceRuleId) {
      // Delete this todo and all future ones in the same recurrence
      await prisma.todo.deleteMany({
        where: {
          userId,
          recurrenceRuleId: todo.recurrenceRuleId,
          dueDate: { gte: todo.dueDate },
        },
      });
    } else {
      await prisma.todo.deleteMany({
        where: { id: todoId, userId },
      });
    }
  } else if (mode === "all") {
    const todo = await prisma.todo.findFirst({
      where: { id: todoId, userId },
    });

    if (todo?.recurrenceRuleId) {
      await prisma.todo.deleteMany({
        where: {
          userId,
          recurrenceRuleId: todo.recurrenceRuleId,
        },
      });
    } else {
      await prisma.todo.deleteMany({
        where: { id: todoId, userId },
      });
    }
  } else {
    // single
    await prisma.todo.deleteMany({
      where: { id: todoId, userId },
    });
  }

  revalidatePath("/todos");
}

async function moveTodoAction(formData: FormData) {
  "use server";

  const userId = await requireUserId();
  const todoId = String(formData.get("todoId") ?? "");
  const newDate = String(formData.get("newDate") ?? "").trim();

  if (!todoId || !newDate) return;

  const todo = await prisma.todo.findFirst({ where: { id: todoId, userId } });
  if (!todo || todo.recurrenceRuleId) return;

  // Preserve the original time
  const oldHours = todo.dueDate.getUTCHours();
  const oldMinutes = todo.dueDate.getUTCMinutes();
  const newDueDate = new Date(`${newDate}T00:00:00.000Z`);
  newDueDate.setUTCHours(oldHours, oldMinutes, 0, 0);

  await prisma.todo.update({
    where: { id: todoId },
    data: { dueDate: newDueDate },
  });

  revalidatePath("/todos");
}

async function logoutAction() {
  "use server";

  await clearSessionCookie();
  redirect("/login");
}

export default async function TodosPage({ searchParams }: TodosPageProps) {
  const userId = await requireUserId();

  const [user, categories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
  ]);

  const todos = await prisma.todo.findMany({
    where: { userId },
    include: { category: true, recurrenceRule: true },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  if (!user) {
    await clearSessionCookie();
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const month = parseMonth(params.month);
  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  const todosByDate = new Map<string, typeof todos>();

  for (const todo of todos) {
    const key = formatDateInputValue(todo.dueDate);
    const existing = todosByDate.get(key) ?? [];
    existing.push(todo);
    todosByDate.set(key, existing);
  }

  const now = new Date();
  const upcomingTodos = todos
    .filter((t) => !t.done && t.dueDate >= now)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  // Serialize for the client Calendar component
  const serializedTodosByDate: Record<string, Array<{ id: string; title: string; done: boolean; dueDate: string; recurrenceRuleId: string | null; hour: number; minute: number }>> = {};
  for (const [key, items] of todosByDate.entries()) {
    serializedTodosByDate[key] = items.map((t) => ({
      id: t.id,
      title: t.title,
      done: t.done,
      dueDate: t.dueDate.toISOString(),
      recurrenceRuleId: t.recurrenceRuleId,
      hour: t.dueDate.getUTCHours(),
      minute: t.dueDate.getUTCMinutes(),
    }));
  }


  const gridDays = daysInCalendarGrid(month);

  const serializedGridDays = gridDays.map(({ date, inMonth }) => ({
    date: formatDateInputValue(date),
    inMonth,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-3 rounded-xl border border-[#5a0a0a]/10 bg-[#5a0a0a] p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">To Dos</h1>
            <p className="text-white/70">Welcome{user.name ? `, ${user.name}` : ""}. Manage tasks by category and due date.</p>
          </div>
          <div className="flex gap-2">
            <AddTodoButton
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              createTodoAction={createTodoAction}
              createCategoryAction={createCategoryAction}
            />
            <Link href="/account" className="rounded-md border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10">
              Account
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-md bg-[#e6b800] px-3 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-yellow-400">
                Log Out
              </button>
            </form>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_300px]">
          {/* Calendar */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Calendar
              monthLabel={formatMonthLabel(month)}
              prevMonthParam={monthParam(prevMonth)}
              nextMonthParam={monthParam(nextMonth)}
              gridDays={serializedGridDays}
              todosByDate={serializedTodosByDate}
              currentDate={new Date().toISOString()}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              createAction={createTodoAction}
              moveTodoAction={moveTodoAction}
              createCategoryAction={createCategoryAction}
            />
          </section>

          {/* Upcoming */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming</h2>
            <div className="mt-3 space-y-3">
              {upcomingTodos.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming todos.</p>
              ) : (
                upcomingTodos.map((todo) => (
                  <article key={todo.id} className="relative rounded-md border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <form action={toggleTodoAction} className="mt-0.5">
                        <input type="hidden" name="todoId" value={todo.id} />
                        <input type="hidden" name="done" value={String(!todo.done)} />
                        <button
                          type="submit"
                          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                            todo.done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 hover:border-slate-400"
                          }`}
                          title={todo.done ? "Mark incomplete" : "Mark complete"}
                        >
                          {todo.done ? (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </button>
                      </form>

                      <div className="min-w-0 flex-1">
                        <h3 className={`text-sm font-medium truncate ${todo.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          {todo.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {todo.dueDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          {" at "}
                          {todo.dueDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          {todo.category ? ` · ${todo.category.name}` : ""}
                        </p>
                        {todo.recurrenceRule ? (
                          <span className="mt-1 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            ↻ {todo.recurrenceRule.frequency.charAt(0) + todo.recurrenceRule.frequency.slice(1).toLowerCase()}
                          </span>
                        ) : null}
                      </div>

                      {/* Trash icon */}
                      <DeleteTodoButton
                        todoId={todo.id}
                        isRecurring={!!todo.recurrenceRuleId}
                        action={deleteTodoAction}
                        variant="icon"
                      />
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
