"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { adminApi, friendlyMessage } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { SessionProvider, useSession } from "@/store/sessionStore";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function LoginForm() {
  const router = useRouter();
  const { session, signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [router, session]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Enter your admin email address.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid admin email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (twoFactorCode && twoFactorCode.length < 6) {
      setError("Enter the 6-digit authenticator code or leave it blank if 2FA is not enabled.");
      return;
    }

    setLoading(true);
    try {
      const session = await adminApi.login({ email: trimmedEmail, password, twoFactorCode: twoFactorCode || undefined });
      signIn(session);
      router.push("/dashboard");
    } catch (caught) {
      setError(friendlyMessage(caught instanceof Error ? caught.message : "", "We could not sign you in. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel w-full max-w-md p-6">
      <div className="mb-6">
        <div className="mb-4 grid size-12 place-items-center rounded-md bg-ink text-white">
          <ShieldCheck size={22} />
        </div>
        <h1 className="text-2xl font-semibold tracking-normal text-ink">Admin sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Secure operator access with role permissions, sessions, and enforced 2FA.</p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="label mb-2 block">Email</span>
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        <label className="block">
          <span className="label mb-2 block">Password</span>
          <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={8} />
        </label>
        <label className="block">
          <span className="label mb-2 block">Authenticator code</span>
          <input
            className="input"
            inputMode="numeric"
            maxLength={6}
            value={twoFactorCode}
            onChange={(event) => setTwoFactorCode(event.target.value)}
            autoComplete="one-time-code"
            placeholder="123456"
          />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

      <Button type="submit" className="mt-6 w-full" icon={<KeyRound size={18} />} disabled={loading}>
        {loading ? "Verifying..." : "Enter dashboard"}
      </Button>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <div className="rounded-md border border-line p-3">
          <LockKeyhole className="mb-2 size-4 text-brand" />
          JWT + refresh session
        </div>
        <div className="rounded-md border border-line p-3">
          <ShieldCheck className="mb-2 size-4 text-accent" />
          IP audit enabled
        </div>
      </div>
    </form>
  );
}

export function LoginPage() {
  return (
    <SessionProvider>
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_440px] lg:items-center"
        >
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <p className="label mb-3">Enterprise fintech operations</p>
              <h2 className="text-5xl font-semibold tracking-normal text-ink">
                Crypto investment oversight with real-time risk control.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Monitor deposits, withdrawal approval layers, KYC, revenue, investment lifecycle jobs, and admin audit trails from one secure command center.
              </p>
            </div>
          </section>
          <LoginForm />
        </motion.div>
      </main>
    </SessionProvider>
  );
}
