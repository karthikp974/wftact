"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    setLoading(false);
    if (!res.ok) {
      setError("Wrong password");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <form onSubmit={onSubmit} className="panel w-full max-w-sm space-y-4">
        <div className="text-center sm:text-left">
          <p className="text-xs font-medium text-blue-600">WorkflowTech</p>
          <h1 className="text-xl font-bold text-neutral-900">Activity Hub</h1>
          <p className="mt-1 text-sm text-neutral-500">hub.workflowtech.info</p>
        </div>
        <input
          className="input"
          type="password"
          placeholder="Dashboard password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="btn w-full" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
