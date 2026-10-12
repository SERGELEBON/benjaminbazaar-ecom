"use client";

import { useEffect, useState } from "react";
import {
  FileText, Paperclip, Check, BadgeCheck, ShieldCheck,
  Bot, Send, ArrowRight, Sparkles, Truck,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

const UNITS = ["piece", "kilogram", "box", "carton", "set", "ton"];

interface RfqRef {
  id: string;
  ref?: string;
  title?: string;
}

export function RfqView() {
  const { setView } = useApp();
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<RfqRef | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    quantity: "",
    unit: "piece",
    budget: "",
    details: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const tree = await res.json();
        const flat: string[] = [];
        for (const c of tree) {
          flat.push(c.name);
          if (c.children?.length) {
            for (const s of c.children) flat.push(`${c.name} / ${s.name}`);
          }
        }
        setCategories(flat.length ? flat : []);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a product name.");
      return;
    }
    if (!form.quantity || parseInt(form.quantity) <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: form.category || "Other",
          quantity: parseInt(form.quantity),
          unit: form.unit,
          budget: form.budget || null,
          details: form.details,
          attachments: files.map((f) => f.name),
        }),
      });
      if (!res.ok) throw new Error("rfq failed");
      const rfq = await res.json();
      const ref =
        rfq.ref ||
        rfq.id?.slice(0, 8).toUpperCase() ||
        Math.random().toString(36).slice(2, 8).toUpperCase();
      setSuccess({ id: rfq.id, ref, title: form.title });
      setForm({
        title: "", category: "", quantity: "", unit: "piece",
        budget: "", details: "",
      });
      setFiles([]);
      toast.success("RFQ submitted! Suppliers will respond soon.");
    } catch {
      toast.error("Failed to submit RFQ. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#f4f1ec] min-h-[60vh]">
      {/* Hero bar */}
      <div className="bg-gradient-to-b from-[#2a1c14] to-[#1a130d] text-white">
        <div className="max-w-[1100px] mx-auto px-4 py-10 lg:py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-[#FF6A00] px-3 py-1 text-[11px] uppercase font-bold tracking-wider mb-4">
            <FileText className="w-3.5 h-3.5" /> Sourcing on your terms
          </div>
          <h1 className="text-[26px] lg:text-[34px] font-extrabold leading-tight">
            Request for Quotation <span className="text-[#FF6A00]">(RFQ)</span>
          </h1>
          <p className="text-[#cdbfb5] text-[13px] mt-2 max-w-2xl mx-auto">
            Tell us what you need — verified suppliers will send you quotes
            within 24h. Free, no commitment, Trade Assurance protected.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* ---- LEFT: form / success ---- */}
          <div className="space-y-4">
            {success ? (
              <div className="bg-white border-2 border-[#16A34A] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#16A34A] flex items-center justify-center">
                    <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[18px] font-bold text-[#16A34A]">RFQ submitted!</div>
                    <div className="text-[12px] text-[#666]">Suppliers will respond soon.</div>
                  </div>
                </div>
                <div className="bg-[#FAFAFA] border border-[#ECECEC] p-3 mb-4">
                  <div className="text-[11px] uppercase text-[#999] tracking-wide">Your RFQ reference</div>
                  <div className="text-[18px] font-extrabold text-[#FF6A00] font-mono">
                    #{success.ref}
                  </div>
                  {success.title && (
                    <div className="text-[12px] text-[#333] mt-1">
                      For: <span className="font-semibold">{success.title}</span>
                    </div>
                  )}
                </div>
                <div className="text-[13px] text-[#444] mb-4 leading-relaxed">
                  <span className="font-bold text-[#16A34A]">3–5 quotes expected within 24h.</span>{" "}
                  We&apos;ll notify you by email &amp; SMS as suppliers respond.
                  You can compare quotes, negotiate with AI assistance, and
                  place your order directly from your dashboard.
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSuccess(null)}
                    className="btn-benjamin-orange"
                  >
                    Submit another RFQ
                  </button>
                  <button
                    onClick={() => setView("buyer-dashboard")}
                    className="btn-outline-grey"
                  >
                    Go to dashboard
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Tell us what you need</div>
                <div className="p-4 space-y-4 max-w-2xl">
                  {/* title */}
                  <Field label="Product name / title" required>
                    <input
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      placeholder="e.g. Cotton t-shirts with custom logo"
                      className={inputCls}
                    />
                  </Field>

                  {/* category + budget */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Category">
                      {categories.length ? (
                        <select
                          value={form.category}
                          onChange={(e) => setField("category", e.target.value)}
                          className={inputCls}
                        >
                          <option value="">Select a category…</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={form.category}
                          onChange={(e) => setField("category", e.target.value)}
                          placeholder="e.g. Apparel / T-shirts"
                          className={inputCls}
                        />
                      )}
                    </Field>
                    <Field label="Budget (optional)">
                      <input
                        value={form.budget}
                        onChange={(e) => setField("budget", e.target.value)}
                        placeholder="e.g. GH₵5–8 / piece"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {/* quantity + unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
                    <Field label="Quantity" required>
                      <input
                        type="number"
                        value={form.quantity}
                        onChange={(e) => setField("quantity", e.target.value)}
                        placeholder="e.g. 1000"
                        min={1}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Unit">
                      <select
                        value={form.unit}
                        onChange={(e) => setField("unit", e.target.value)}
                        className={inputCls}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* details */}
                  <Field label="Details (specs, target market, customization…)">
                    <textarea
                      value={form.details}
                      onChange={(e) => setField("details", e.target.value)}
                      placeholder="Describe the product, materials, certifications needed, target market, packaging, customization…"
                      rows={5}
                      className={`${inputCls} resize-y min-h-[110px]`}
                    />
                  </Field>

                  {/* attachments */}
                  <Field label="Attachments (specs, images, references)">
                    <label className="flex items-center gap-2 border border-dashed border-[#DADAD9] bg-[#FAFAFA] px-3 py-3 cursor-pointer hover:border-[#FF6A00]">
                      <Paperclip className="w-4 h-4 text-[#FF6A00]" />
                      <span className="text-[12px] text-[#666]">
                        {files.length
                          ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
                          : "Click to attach files (images, PDF, DOCX)"}
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                      />
                    </label>
                    {files.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {files.map((f, i) => (
                          <li key={i} className="text-[11px] text-[#555] flex items-center gap-1.5">
                            <Paperclip className="w-3 h-3 text-[#FF6A00]" /> {f.name}
                            <button
                              type="button"
                              onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-[#999] hover:text-[#FF6A00] ml-auto"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Field>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-benjamin-orange flex items-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      "Submitting…"
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit RFQ
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-[#999]">
                    By submitting, you agree to BENJAMINBAZAAR&apos;s Terms &amp; Privacy Policy.
                  </p>
                </div>
              </form>
            )}

            {/* How it works */}
            <div className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">How it works</div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Step n={1} title="Post your request" desc="Describe the product, quantity and target price." />
                <Step n={2} title="Receive quotes" desc="Verified suppliers respond with quotes within 24h." />
                <Step n={3} title="Compare &amp; order" desc="Negotiate with AI, compare, place order with Trade Assurance." />
              </div>
            </div>
          </div>

          {/* ---- RIGHT: why use RFQ ---- */}
          <aside>
            <div className="sticky top-[140px] space-y-4">
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar-red">Why use RFQ</div>
                <ul className="p-4 space-y-3 text-[12px]">
                  <Benefit
                    icon={BadgeCheck}
                    title="Free, no commitment"
                    desc="Post unlimited RFQs at zero cost."
                  />
                  <Benefit
                    icon={ShieldCheck}
                    title="Verified suppliers only"
                    desc="Responses come from vetted, Trade- Assurance-ready suppliers."
                  />
                  <Benefit
                    icon={Bot}
                    title="AI-assisted negotiation"
                    desc="Our AI drafts counter-offers &amp; translates specs."
                  />
                  <Benefit
                    icon={Truck}
                    title="On-time dispatch ≥ 98%"
                    desc="Trade Assurance protects your money &amp; delivery."
                  />
                </ul>
              </div>

              <div className="bg-[#FF6A00] text-white p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4" />
                  <div className="text-[13px] font-bold uppercase tracking-wide">Pro tip</div>
                </div>
                <p className="text-[12px] leading-snug opacity-95">
                  The more detail you provide (specs, target market, certifications),
                  the more accurate the quotes you&apos;ll receive.
                </p>
              </div>

              <button
                onClick={() => setView("home")}
                className="btn-outline-grey w-full flex items-center justify-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to home
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-[#DADAD9] bg-white px-3 py-2 text-[13px] text-[#333] outline-none focus:border-[#FF6A00] placeholder:text-[#999]";

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-[#555] mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-[#FF6A00]"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-[#FF6A00] text-white font-extrabold flex items-center justify-center shrink-0">
        {n}
      </div>
      <div>
        <div
          className="text-[13px] font-bold text-[#333]"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <div
          className="text-[11px] text-[#666] mt-0.5 leading-snug"
          dangerouslySetInnerHTML={{ __html: desc }}
        />
      </div>
    </div>
  );
}

function Benefit({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof BadgeCheck;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <div className="w-8 h-8 bg-[#ECECEC] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#FF6A00]" strokeWidth={1.8} />
      </div>
      <div>
        <div
          className="text-[13px] font-bold text-[#333]"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <div
          className="text-[11px] text-[#666] mt-0.5 leading-snug"
          dangerouslySetInnerHTML={{ __html: desc }}
        />
      </div>
    </li>
  );
}
