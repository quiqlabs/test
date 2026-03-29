"use client";

import { useState } from "react";
import RecurrencePicker from "@/components/RecurrencePicker";

interface AddTodoButtonProps {
  categories: Array<{ id: string; name: string }>;
  createTodoAction: (formData: FormData) => void;
  createCategoryAction: (formData: FormData) => void;
}

export default function AddTodoButton({
  categories,
  createTodoAction,
  createCategoryAction,
}: AddTodoButtonProps) {
  const [open, setOpen] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        + Add To Do
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add To Do</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              action={(formData) => {
                createTodoAction(formData);
                setOpen(false);
              }}
              className="space-y-3"
            >
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
                  name="dueDate"
                  type="date"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
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
                      id="newCategoryName"
                      type="text"
                      placeholder="New category name"
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("newCategoryName") as HTMLInputElement;
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
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" className="rounded-md bg-[#5a0a0a] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1a1a]">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
