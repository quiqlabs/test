import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, setSessionCookie } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  required: "Email and password are required.",
  invalid: "Invalid email or password.",
  exists: "An account with that email already exists.",
  short: "Password must be at least 8 characters.",
  unknown: "Something went wrong. Please try again.",
};

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=required");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    redirect("/login?error=invalid");
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    redirect("/login?error=invalid");
  }

  await setSessionCookie(user.id);
  redirect("/todos");
}

async function registerAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=required");
  }

  if (password.length < 8) {
    redirect("/login?error=short");
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    redirect("/login?error=exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      password: passwordHash,
    },
  });

  await setSessionCookie(user.id);
  redirect("/todos");
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const userId = await getSessionUserId();

  if (userId) {
    redirect("/todos");
  }

  const params = (await searchParams) ?? {};
  const error = params.error ? errorMessages[params.error] ?? errorMessages.unknown : null;

  return (
    <main className="bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl bg-[#5a0a0a] p-6 text-center">
          <h1 className="text-3xl font-bold text-white">Welcome to <span className="text-[#e6b800]">Quiq</span> Labs</h1>
          <p className="mt-2 text-white/70">Sign in or create an account to manage your tasks.</p>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#5a0a0a]">Sign In</h2>
            <form action={loginAction} className="mt-4 space-y-3">
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
                required
              />
              <button
                type="submit"
                className="w-full rounded-md bg-[#5a0a0a] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1a1a]"
              >
                Sign In
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#5a0a0a]">Create Account</h2>
            <form action={registerAction} className="mt-4 space-y-3">
              <input
                name="name"
                type="text"
                placeholder="Name (optional)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Password (min 8 chars)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-[#5a0a0a] focus:outline-none focus:ring-1 focus:ring-[#5a0a0a]"
                required
                minLength={8}
              />
              <button
                type="submit"
                className="w-full rounded-md bg-[#e6b800] px-4 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-yellow-400"
              >
                Create Account
              </button>
            </form>
          </section>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Need a public endpoint check? Visit <Link href="/api/health" className="underline">/api/health</Link>.
        </p>
      </div>
    </main>
  );
}
