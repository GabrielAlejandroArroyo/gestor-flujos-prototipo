"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginClient(): React.ReactElement {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Login fallido");
      router.push("/gestion");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel login-panel" data-hydrated={hydrated ? "true" : "false"}>
      <h2 className="panel-title">Iniciar sesión</h2>
      <p className="gestion-empty">Usuarios mock (misma semántica que el prototipo).</p>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      <form className="form-grid" data-testid="login-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="login-username">Usuario</label>
          <input
            id="login-username"
            data-testid="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" data-testid="login-submit" disabled={busy}>
          Entrar
        </button>
      </form>
    </section>
  );
}
