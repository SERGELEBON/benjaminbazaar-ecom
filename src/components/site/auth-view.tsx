"use client";

import { useState } from "react";
import {
  Mail, Phone, Building2, Lock, ShieldCheck, ArrowRight, Eye, EyeOff,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useApp } from "@/lib/store";
import {
  InputOTP, InputOTPGroup, InputOTPSlot,
} from "@/components/ui/input-otp";
import { brandEmail } from "@/lib/brand";

type Tab = "buyer" | "supplier";

export function AuthView() {
  const { signIn, setView } = useApp();

  // buyer state
  const [bEmail, setBEmail] = useState(brandEmail("buyer"));
  const [bPhone, setBPhone] = useState("+233 50 123 4567");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  // supplier state
  const [sCompany, setSCompany] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sPwd, setSPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [tab, setTab] = useState<Tab>("buyer");

  function sendOtp() {
    if (!bEmail || !bPhone) {
      toast.error("Please enter email and phone first.");
      return;
    }
    setSendingOtp(true);
    setTimeout(() => {
      setSendingOtp(false);
      setOtpSent(true);
      toast.success("OTP sent to " + bEmail + " (use 123456)");
    }, 700);
  }

  function verifyBuyer() {
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    signIn("Demo Buyer", brandEmail("buyer"), "BUYER");
    toast.success("Welcome back!");
    setView("buyer-dashboard");
  }

  function supplierSignIn() {
    if (!sCompany || !sEmail || !sPhone || !sPwd) {
      toast.error("Please fill all fields");
      return;
    }
    signIn("Demo Supplier", brandEmail("supplier"), "SUPPLIER");
    toast.success("Welcome to your supplier dashboard");
    setView("supplier-dashboard");
  }

  return (
    <div className="bg-[#ECECEC] min-h-screen">
      <Toaster position="top-center" richColors closeButton />
      <div className="max-w-[1100px] mx-auto px-3 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM CARD */}
        <div className="bg-white border border-[#DADAD9] max-w-md w-full mx-auto lg:mx-0">
          <div className="benjamin-bar">Sign in to BENJAMINBAZAAR</div>

          {/* tabs */}
          <div className="grid grid-cols-2 border-b border-[#DADAD9]">
            {(["buyer", "supplier"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 text-[13px] font-bold uppercase tracking-wide transition-colors ${
                  tab === t
                    ? "bg-[#FF6A00] text-white"
                    : "bg-white text-[#666] hover:bg-[#ECECEC]"
                }`}
              >
                {t === "buyer" ? "Buyer" : "Supplier"}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === "buyer" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">
                    Email
                  </label>
                  <div className="flex items-center border border-[#DADAD9] focus-within:border-[#FF6A00]">
                    <Mail className="w-4 h-4 text-[#999] ml-3" />
                    <input
                      type="email"
                      value={bEmail}
                      onChange={(e) => setBEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 px-2 py-2.5 text-[13px] outline-none bg-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">
                    Phone number
                  </label>
                  <div className="flex items-center border border-[#DADAD9] focus-within:border-[#FF6A00]">
                    <Phone className="w-4 h-4 text-[#999] ml-3" />
                    <input
                      type="tel"
                      value={bPhone}
                      onChange={(e) => setBPhone(e.target.value)}
                      placeholder="+233 …"
                      className="flex-1 px-2 py-2.5 text-[13px] outline-none bg-transparent"
                    />
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    onClick={sendOtp}
                    disabled={sendingOtp}
                    className="btn-square-black w-full flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {sendingOtp ? "Sending…" : "Send OTP"}
                    {!sendingOtp && <ArrowRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1.5">
                        Enter 6-digit code
                      </label>
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(v) => setOtp(v)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-10 h-10 border border-[#DADAD9] first:border-l" />
                          <InputOTPSlot index={1} className="w-10 h-10 border border-[#DADAD9]" />
                          <InputOTPSlot index={2} className="w-10 h-10 border border-[#DADAD9]" />
                          <InputOTPSlot index={3} className="w-10 h-10 border border-[#DADAD9]" />
                          <InputOTPSlot index={4} className="w-10 h-10 border border-[#DADAD9]" />
                          <InputOTPSlot index={5} className="w-10 h-10 border border-[#DADAD9]" />
                        </InputOTPGroup>
                      </InputOTP>
                      <p className="text-[11px] text-[#888] mt-1.5">
                        Code sent to {bEmail}. Use <span className="font-bold">123456</span> for the demo.
                      </p>
                    </div>
                    <button onClick={verifyBuyer} className="btn-benjamin-orange w-full">
                      Verify &amp; Sign in
                    </button>
                    <button
                      onClick={() => { setOtpSent(false); setOtp(""); }}
                      className="benjamin-link text-[12px]"
                    >
                      ← Use a different phone
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                <Field label="Company name" icon={<Building2 className="w-4 h-4 text-[#999] ml-3" />}>
                  <input
                    type="text"
                    value={sCompany}
                    onChange={(e) => setSCompany(e.target.value)}
                    placeholder="Acme Manufacturing Ltd."
                    className="flex-1 px-2 py-2.5 text-[13px] outline-none bg-transparent"
                  />
                </Field>
                <Field label="Email" icon={<Mail className="w-4 h-4 text-[#999] ml-3" />}>
                  <input
                    type="email"
                    value={sEmail}
                    onChange={(e) => setSEmail(e.target.value)}
                    placeholder="supplier@yourco.com"
                    className="flex-1 px-2 py-2.5 text-[13px] outline-none bg-transparent"
                  />
                </Field>
                <Field label="Phone" icon={<Phone className="w-4 h-4 text-[#999] ml-3" />}>
                  <input
                    type="tel"
                    value={sPhone}
                    onChange={(e) => setSPhone(e.target.value)}
                    placeholder="+86 …"
                    className="flex-1 px-2 py-2.5 text-[13px] outline-none bg-transparent"
                  />
                </Field>
                <Field label="Password" icon={<Lock className="w-4 h-4 text-[#999] ml-3" />}>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={sPwd}
                    onChange={(e) => setSPwd(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 px-2 py-2.5 text-[13px] outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="px-3 text-[#888] hover:text-[#FF6A00]"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>
                <button onClick={supplierSignIn} className="btn-benjamin-orange w-full">
                  Sign in as supplier
                </button>
              </div>
            )}

            {/* divider + google */}
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[#DADAD9]" />
              <span className="text-[11px] text-[#999] uppercase font-bold tracking-wider">OR</span>
              <div className="h-px flex-1 bg-[#DADAD9]" />
            </div>
            <button
              onClick={() => {
                signIn("Demo Buyer", brandEmail("buyer"), "BUYER");
                toast.success("Signed in with Google");
                setView("buyer-dashboard");
              }}
              className="btn-outline-grey w-full flex items-center justify-center gap-2"
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div className="mt-4 flex items-center justify-between text-[12px]">
              <button className="benjamin-link">Forgot password?</button>
              <button className="benjamin-link">Create account</button>
            </div>

            {/* demo creds hint */}
            <div className="mt-5 border border-[#DADAD9] bg-[#ECECEC] p-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#FF6A00]">
                <ShieldCheck className="w-3.5 h-3.5" /> Demo credentials
              </div>
              <ul className="mt-1.5 text-[12px] text-[#444] space-y-0.5">
                <li>Buyer: <span className="font-bold">{brandEmail("buyer")}</span></li>
                <li>Supplier: <span className="font-bold">{brandEmail("supplier")}</span></li>
                <li>Admin: <span className="font-bold">{brandEmail("admin")}</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* PROMO PANEL (desktop only) */}
        <div className="hidden lg:block">
          <div className="bg-[#0A0F4D] text-white h-full">
            <div className="benjamin-bar-red">Trade Assurance</div>
            <div className="p-6">
              <img
                src="https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=70"
                alt="warehouse"
                className="w-full h-48 object-cover mb-5"
              />
              <h2 className="text-[22px] font-extrabold leading-tight">
                Trade Assurance protects every order
              </h2>
              <p className="text-[13px] text-[#CFD6F5] mt-2">
                Source confidently with money-back guarantees, secure payments, and verified suppliers worldwide.
              </p>
              <ul className="mt-4 space-y-2 text-[13px]">
                {[
                  "Order protection up to 100% of payment",
                  "Secure payment via escrow",
                  "On-time dispatch guarantee ≥ 98%",
                  "Verified supplier vetting reports",
                  "24/7 dispute resolution support",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A] mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => setView("help")} className="btn-square-black mt-6 w-full">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, icon, children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">
        {label}
      </label>
      <div className="flex items-center border border-[#DADAD9] focus-within:border-[#FF6A00]">
        {icon}
        {children}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
