import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, clearSessionCookie } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    await clearSessionCookie();
    redirect("/login");
  }

  return user;
}

async function updateProfileAction(formData: FormData) {
  "use server";

  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    redirect("/account?error=email_taken");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || null,
      email,
    },
  });

  revalidatePath("/account");
  redirect("/account?success=profile");
}

async function changePasswordAction(formData: FormData) {
  "use server";

  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!currentPassword || !newPassword) return;

  if (newPassword.length < 8) {
    redirect("/account?error=short_password");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) {
    redirect("/account?error=wrong_password");
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  redirect("/account?success=password");
}

async function deleteAccountAction() {
  "use server";

  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  await prisma.todo.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await clearSessionCookie();
  redirect("/login");
}

type AccountPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

const errorMessages: Record<string, string> = {
  email_taken: "That email is already in use by another account.",
  wrong_password: "Current password is incorrect.",
  short_password: "New password must be at least 8 characters.",
};

const successMessages: Record<string, string> = {
  profile: "Profile updated successfully.",
  password: "Password changed successfully.",
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const error = params.error ? errorMessages[params.error] : null;
  const success = params.success ? successMessages[params.success] : null;

  return (
    <main className="bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
          <Link href="/todos" className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Back to Todos
          </Link>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
        )}

        {/* Profile */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#5a0a0a]">Profile</h2>
          <form action={updateProfileAction} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                name="name"
                type="text"
                defaultValue={user.name ?? ""}
                placeholder="Your name"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
                required
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-[#5a0a0a] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1a1a]"
            >
              Save Changes
            </button>
          </form>
        </section>

        {/* Change Password */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#5a0a0a]">Change Password</h2>
          <form action={changePasswordAction} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
              <input
                name="currentPassword"
                type="password"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                name="newPassword"
                type="password"
                placeholder="Min 8 characters"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-[#5a0a0a] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1a1a]"
            >
              Change Password
            </button>
          </form>
        </section>

        {/* Danger Zone */}
        <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
          <p className="mt-2 text-sm text-slate-600">Permanently delete your account and all your data. This cannot be undone.</p>
          <form action={deleteAccountAction} className="mt-4">
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              onClick={(e) => {
                if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) {
                  e.preventDefault();
                }
              }}
            >
              Delete Account
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
