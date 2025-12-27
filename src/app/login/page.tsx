// src/app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || googleLoading || resetLoading) return;

    setErro(null);
    setResetMsg(null);
    setLoading(true);

    try {
      const emailLimpo = email.trim();
      await signInWithEmailAndPassword(auth, emailLimpo, senha);
      router.push("/crm/dashboard");
    } catch (err: any) {
      console.error(err);

      if (
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/wrong-password"
      ) {
        setErro("E-mail ou senha inválidos.");
      } else if (err?.code === "auth/too-many-requests") {
        setErro("Muitas tentativas. Tente novamente em alguns instantes.");
      } else {
        setErro("Não foi possível fazer login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSenha() {
    if (resetLoading || loading || googleLoading) return;

    setErro(null);
    setResetMsg(null);

    const emailLimpo = email.trim();
    if (!emailLimpo) {
      setErro("Informe o seu e-mail para redefinir a senha.");
      return;
    }

    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, emailLimpo);
      setResetMsg("Enviamos um e-mail com instruções para redefinir sua senha.");
    } catch (err: any) {
      console.error(err);

      let msg =
        "Não foi possível enviar o e-mail de redefinição. Tente novamente.";

      if (err?.code === "auth/user-not-found") {
        msg = "Não encontramos um usuário com este e-mail.";
      } else if (err?.code === "auth/invalid-email") {
        msg = "E-mail inválido. Verifique se digitou corretamente.";
      } else if (err?.code === "auth/missing-email") {
        msg = "Informe um e-mail para redefinir a senha.";
      } else if (err?.code === "auth/network-request-failed") {
        msg = "Erro de conexão. Verifique sua internet.";
      }

      // Em desenvolvimento, mostra o código pra facilitar debug
      if (process.env.NODE_ENV === "development" && err?.code) {
        msg += ` (código: ${err.code})`;
      }

      setErro(msg);
    } finally {
      setResetLoading(false);
    }
  }

  async function handleLoginGoogle() {
    if (googleLoading || loading || resetLoading) return;

    setErro(null);
    setResetMsg(null);

    try {
      setGoogleLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/crm/dashboard");
    } catch (err: any) {
      console.error(err);
      // se o usuário fechar o popup, não mostramos erro chato
      if (err?.code !== "auth/popup-closed-by-user") {
        setErro("Não foi possível entrar com Google. Tente novamente.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  const algumLoading = loading || resetLoading || googleLoading;

  return (
    <div className="loginShell">
      <div className="loginPanel">
        {/* Logo / Brand */}
        <div className="logoRow">
          <div className="logoCircle">
            <span className="logoLetters">MN</span>
          </div>
          <div className="logoTextGroup">
            <span className="logoSmall">Maison Noor</span>
            <span className="logoMain">CRM</span>
          </div>
        </div>

        <div className="brandLine" aria-hidden />

        <p className="subtitle">
          Acesse o painel para gerenciar{" "}
          <strong>leads, vendas, estoque e financeiro</strong>.
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="loginForm" noValidate>
          <div className="field">
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="seuemail@exemplo.com"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {erro && <p className="error">{erro}</p>}
          {resetMsg && <p className="success">{resetMsg}</p>}

          <div className="actionsRow">
            <button
              type="button"
              className="linkButton"
              onClick={handleResetSenha}
              disabled={algumLoading}
            >
              {resetLoading ? "Enviando..." : "Esqueci minha senha"}
            </button>
          </div>

          <button type="submit" disabled={algumLoading} className="submit">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Divider */}
        <div className="dividerRow">
          <span className="dividerLine" />
          <span className="dividerText">ou</span>
          <span className="dividerLine" />
        </div>

        {/* Login com Google */}
        <button
          type="button"
          className="googleButton"
          onClick={handleLoginGoogle}
          disabled={algumLoading}
        >
          <span className="googleIcon">
            <span className="googleG">G</span>
          </span>
          <span>{googleLoading ? "Conectando..." : "Entrar com Google"}</span>
        </button>

        {/* Rodapé */}
        <div className="loginFooter">
          <span className="dot" aria-hidden />
          <span className="footerText">Acesso restrito • Maison Noor CRM</span>
        </div>
      </div>

      <style jsx>{`
        .loginShell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            radial-gradient(1200px 600px at 15% -10%, rgba(200, 162, 106, 0.18), transparent 55%),
            radial-gradient(900px 500px at 90% 10%, rgba(200, 162, 106, 0.12), transparent 55%),
            #050509;
          color: #f5f5f5;
        }

        .loginPanel {
          width: 100%;
          max-width: 420px;
          border-radius: 22px;
          padding: 24px 22px 22px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background:
            radial-gradient(700px 260px at 0% -20%, rgba(200, 162, 106, 0.18), transparent 60%),
            rgba(8, 8, 12, 0.96);
          box-shadow:
            0 25px 60px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          display: grid;
          gap: 18px;
          animation: cardIn 0.35s ease-out;
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .logoRow {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logoCircle {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 0%, #f9e0b5, #c18b43);
          box-shadow:
            0 8px 20px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logoLetters {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #1a1209;
        }

        .logoTextGroup {
          display: grid;
          gap: 2px;
        }

        .logoSmall {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: rgba(200, 162, 106, 0.95);
          font-weight: 800;
        }

        .logoMain {
          font-size: 20px;
          font-weight: 950;
          letter-spacing: 0.06em;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.98),
            rgba(200, 162, 106, 0.92)
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .brandLine {
          margin-top: 10px;
          height: 1px;
          background: linear-gradient(
            90deg,
            rgba(200, 162, 106, 0.4),
            rgba(255, 255, 255, 0.06),
            rgba(200, 162, 106, 0.25)
          );
          opacity: 0.9;
        }

        .subtitle {
          margin-top: 4px;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(230, 230, 230, 0.86);
        }

        .subtitle strong {
          color: rgba(255, 203, 134, 0.96);
          font-weight: 600;
        }

        .loginForm {
          display: grid;
          gap: 12px;
          margin-top: 4px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(226, 226, 226, 0.9);
        }

        .input {
          border-radius: 12px;
          border: 1px solid rgba(120, 113, 108, 0.9);
          padding: 9px 11px;
          font-size: 14px;
          background: rgba(15, 15, 20, 0.96);
          color: #f5f5f5;
          outline: none;
          transition:
            border-color 0.16s ease,
            box-shadow 0.16s ease,
            background-color 0.16s ease,
            transform 0.08s ease;
        }

        .input::placeholder {
          color: rgba(156, 163, 175, 0.7);
        }

        .input:focus {
          border-color: rgba(245, 208, 150, 0.95);
          box-shadow: 0 0 0 1px rgba(245, 208, 150, 0.7);
          background: rgba(18, 18, 25, 0.98);
          transform: translateY(-0.5px);
        }

        .error {
          margin-top: 2px;
          font-size: 12px;
          border-radius: 10px;
          padding: 7px 9px;
          color: #fecaca;
          background: rgba(127, 29, 29, 0.4);
          border: 1px solid rgba(248, 113, 113, 0.55);
        }

        .success {
          margin-top: 2px;
          font-size: 12px;
          border-radius: 10px;
          padding: 7px 9px;
          color: #bbf7d0;
          background: rgba(22, 101, 52, 0.4);
          border: 1px solid rgba(52, 211, 153, 0.65);
        }

        .actionsRow {
          display: flex;
          justify-content: flex-end;
        }

        .linkButton {
          background: none;
          border: none;
          padding: 0;
          font-size: 12px;
          color: rgba(248, 250, 252, 0.8);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: rgba(248, 250, 252, 0.55);
          transition: color 0.16s ease, text-decoration-color 0.16s ease;
        }

        .linkButton:hover:not(:disabled) {
          color: rgba(252, 211, 77, 0.98);
          text-decoration-color: rgba(252, 211, 77, 0.9);
        }

        .linkButton:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .submit {
          margin-top: 6px;
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          background: linear-gradient(90deg, #fbbf77, #facc6b);
          color: #1b130a;
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(0, 0, 0, 0.4);
          transition:
            transform 0.14s ease,
            box-shadow 0.14s ease,
            filter 0.14s ease,
            opacity 0.14s ease;
        }

        .submit:hover:not(:disabled) {
          filter: brightness(1.03);
          transform: translateY(-1px);
          box-shadow:
            0 16px 40px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(0, 0, 0, 0.5);
        }

        .submit:disabled {
          opacity: 0.6;
          cursor: default;
          box-shadow:
            0 6px 18px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(0, 0, 0, 0.45);
        }

        .dividerRow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
        }

        .dividerLine {
          flex: 1;
          height: 1px;
          background: rgba(148, 163, 184, 0.3);
        }

        .dividerText {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(148, 163, 184, 0.9);
        }

        .googleButton {
          margin-top: 2px;
          width: 100%;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.7);
          padding: 8px 14px;
          background: rgba(15, 23, 42, 0.9);
          color: rgba(226, 232, 240, 0.96);
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition:
            background-color 0.16s ease,
            border-color 0.16s ease,
            transform 0.12s ease,
            box-shadow 0.16s ease,
            opacity 0.14s ease;
        }

        .googleButton:hover:not(:disabled) {
          background: rgba(15, 23, 42, 1);
          border-color: rgba(249, 250, 251, 0.85);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.75);
          transform: translateY(-1px);
        }

        .googleButton:disabled {
          opacity: 0.6;
          cursor: default;
          box-shadow: none;
        }

        .googleIcon {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.3);
        }

        .googleG {
          font-size: 14px;
          font-weight: 900;
          color: #4285f4;
        }

        .loginFooter {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(200, 200, 200, 0.7);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(74, 222, 128, 0.9);
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
        }

        .footerText {
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        @media (max-width: 640px) {
          .loginPanel {
            padding: 20px 18px 18px;
            border-radius: 18px;
          }
        }
      `}</style>
    </div>
  );
}
