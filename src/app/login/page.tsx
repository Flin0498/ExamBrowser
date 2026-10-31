import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md">
        <div className="card-body">
          <div className="mb-8 text-center">
            <span
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
              aria-hidden
            >
              Ex
            </span>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">Exam System</h1>
            <p className="mt-1 text-sm text-slate-600">Sign in to your account</p>
          </div>
          {params.error && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Invalid username or password.
            </p>
          )}
          <form
            className="space-y-4"
            action={async (formData) => {
              "use server";
              try {
                await signIn("credentials", {
                  username: formData.get("username"),
                  password: formData.get("password"),
                  redirectTo: "/",
                });
              } catch (e) {
                if (e instanceof AuthError) {
                  redirect("/login?error=1");
                }
                throw e;
              }
            }}
          >
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                required
                className="input mt-1.5"
                placeholder="teacher or student1"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input mt-1.5"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5">
              Sign in
            </button>
          </form>
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Demo accounts: teacher / teacher123 · student1 / student123
          </p>
        </div>
      </div>
    </div>
  );
}
