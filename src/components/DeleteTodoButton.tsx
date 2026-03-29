"use client";

import { useState, useRef, useEffect } from "react";

interface DeleteTodoButtonProps {
  todoId: string;
  isRecurring: boolean;
  action: (formData: FormData) => void;
  variant?: "button" | "icon";
}

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function DeleteTodoButton({ todoId, isRecurring, action, variant = "button" }: DeleteTodoButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const btnClass = variant === "icon"
    ? "text-slate-400 hover:text-rose-600 transition-colors"
    : "rounded-md bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800";

  const btnContent = variant === "icon" ? <TrashIcon /> : "Delete";

  if (!isRecurring) {
    return (
      <form action={action}>
        <input type="hidden" name="todoId" value={todoId} />
        <input type="hidden" name="deleteMode" value="single" />
        <button type="submit" className={btnClass}>
          {btnContent}
        </button>
      </form>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        className={btnClass}
      >
        {btnContent}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <form action={action} onSubmit={() => setShowMenu(false)}>
            <input type="hidden" name="todoId" value={todoId} />
            <input type="hidden" name="deleteMode" value="single" />
            <button type="submit" className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
              Delete this event only
            </button>
          </form>
          <form action={action} onSubmit={() => setShowMenu(false)}>
            <input type="hidden" name="todoId" value={todoId} />
            <input type="hidden" name="deleteMode" value="this_and_future" />
            <button type="submit" className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
              Delete this and all future events
            </button>
          </form>
          <form action={action} onSubmit={() => setShowMenu(false)}>
            <input type="hidden" name="todoId" value={todoId} />
            <input type="hidden" name="deleteMode" value="all" />
            <button type="submit" className="block w-full px-4 py-2 text-left text-sm text-rose-700 hover:bg-rose-50">
              Delete all events in series
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
