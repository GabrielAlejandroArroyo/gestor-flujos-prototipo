"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginClient(): React.ReactElement {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <section className="panel login-panel">
      <h2 className="panel-title">Iniciar sesión</h2>
      <p className="gestion-empty">Usuarios mock (misma semántica que el prototipo).</p>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Usuario</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>
        <div className="form-row">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Entrar
        </button>
      </form>
    </section>
  );
}
