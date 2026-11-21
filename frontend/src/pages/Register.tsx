import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import { errorMessage } from "../api";
import { SparklesIcon, AlertCircleIcon, SunIcon, MoonIcon } from "../components/Icons";

export default function Register() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient Cosmic Red Glow Circles */}
      <div
        className="ambient-glow-circle"
        style={{
          width: 500,
          height: 500,
          top: "-15%",
          left: "-10%",
          background: "radial-gradient(circle, rgba(255, 46, 77, 0.18) 0%, transparent 70%)",
        }}
      />
      <div
        className="ambient-glow-circle"
        style={{
          width: 450,
          height: 450,
          bottom: "-15%",
          right: "-10%",
          background: "radial-gradient(circle, rgba(255, 46, 77, 0.14) 0%, transparent 70%)",
        }}
      />

      {/* Top Theme Switcher */}
      <div style={{ position: "absolute", top: 20, right: 24 }}>
        <button
          onClick={toggleTheme}
          style={{
            background: "var(--bg-glass-card)",
            border: "1px solid var(--border-subtle)",
            color: theme === "dark" ? "var(--lime)" : "var(--navy)",
            width: 38,
            height: 38,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {theme === "dark" ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
        </button>
      </div>

      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 38,
          zIndex: 1,
          boxShadow: "var(--shadow-lg), 0 0 35px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: "var(--lime)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 24px var(--lime-glow)",
            }}
          >
            <SparklesIcon width={28} height={28} stroke="#080F14" />
          </div>
          <h2 style={{ fontSize: 26, color: "var(--text-primary)", marginBottom: 8, letterSpacing: "-0.03em" }}>
            Create an Account
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Join CollabSpace AI and start collaborating with your university group
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(220, 38, 38, 0.12)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              color: "#EF4444",
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 13,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircleIcon width={16} height={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Maya Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              University Email
            </label>
            <input
              type="email"
              placeholder="e.g. maya@uni.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Password (min. 8 characters)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-lime btn-lg"
            style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 700, color: "var(--lime)", textDecoration: "none" }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
