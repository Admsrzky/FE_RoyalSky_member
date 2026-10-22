"use client";

import { Brand } from "./brand";
import { Icon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

export function PortalError({ message }: { message: string }) {
  return (
    <div className="error-shell">
      <header className="login-topbar">
        <Brand />
        <ThemeToggle />
      </header>

      <main className="error-main">
        <div className="error-card">
          <span className="auth-icon is-danger">
            <Icon name="alert" size={20} />
          </span>
          <span className="eyebrow">Koneksi terputus</span>
          <h1>Kartu member belum bisa dimuat.</h1>
          <p>{message}</p>
          <div className="error-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Coba lagi
              <Icon name="refresh" size={16} />
            </button>
            <a className="btn-ghost" href="/api/auth/logout">
              Keluar
            </a>
          </div>
        </div>
      </main>

      <footer className="login-footer">
        <span>© 2026 Royal Sky Gym Club · KCP Banten</span>
        <span>Portal member digital</span>
      </footer>
    </div>
  );
}
