"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { updateReportSettings, generateReportNow, sendTestWhatsApp, sendTestEmail } from "@/lib/reports/agent/actions";
import type { ReportSettings } from "@/lib/reports/agent/settings";

const WA_STATUS: Record<string, { label: string; icon: string; cls: string }> = {
  connected: { label: "Connected", icon: "check_circle", cls: "text-primary" },
  pending: { label: "Saved — send a test to confirm", icon: "info", cls: "text-tertiary" },
  error: { label: "Error — check number & server credentials", icon: "error", cls: "text-error" },
  not_configured: { label: "Not configured", icon: "info", cls: "text-on-surface-variant" },
};

const EMAIL_STATUS: Record<string, { label: string; icon: string; cls: string }> = {
  connected: { label: "Connected", icon: "check_circle", cls: "text-primary" },
  pending: { label: "Saved — send a test to confirm", icon: "info", cls: "text-tertiary" },
  error: { label: "Error — check address & App Password", icon: "error", cls: "text-error" },
  not_configured: { label: "Not configured", icon: "info", cls: "text-on-surface-variant" },
};

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const field = "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60";

function Toggle({ name, defaultChecked, label, desc, disabled }: { name: string; defaultChecked: boolean; label: string; desc?: string; disabled?: boolean }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="w-5 h-5 mt-0.5 rounded border-outline-variant text-primary focus:ring-primary" />
      <span>
        <span className="block font-label-md text-label-md text-on-surface">{label}</span>
        {desc && <span className="block font-body-sm text-body-sm text-on-surface-variant">{desc}</span>}
      </span>
    </label>
  );
}

export function AiReportsTab({ settings, canManage, timezone }: { settings: ReportSettings; canManage: boolean; timezone: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [gen, startGen] = useTransition();
  const [testing, startTest] = useTransition();
  const [emailing, startEmail] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const d = !canManage;

  function testWhatsApp() {
    setTestMsg(null);
    startTest(async () => {
      const res = await sendTestWhatsApp();
      setTestMsg(res.ok ? { ok: true, text: `Test sent — ${res.detail}` } : { ok: false, text: res.error });
      router.refresh();
    });
  }

  function testEmail() {
    setEmailMsg(null);
    startEmail(async () => {
      const res = await sendTestEmail();
      setEmailMsg(res.ok ? { ok: true, text: `Test sent — ${res.detail}` } : { ok: false, text: res.error });
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    start(async () => {
      const res = await updateReportSettings(fd);
      setMsg(res.ok ? { ok: true, text: "Report settings saved." } : { ok: false, text: res.error });
    });
  }
  function runNow(type: "daily" | "weekly") {
    setMsg(null);
    startGen(async () => {
      const res = await generateReportNow(type);
      if (res.ok) { setMsg({ ok: true, text: `${type === "daily" ? "Daily" : "Weekly"} report generated (${res.source}). Open it in Reports → AI.` }); router.refresh(); }
      else setMsg({ ok: false, text: res.error });
    });
  }

  return (
    <form ref={formRef} onSubmit={save} className="space-y-lg">
      {/* Master switch */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="smart_toy" className="text-primary" />
          <h3 className="font-headline-lg text-headline-lg text-on-surface">AI Business Reports</h3>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">Automatic daily/weekly reports of your real sales, unpaid money, profit and inventory — with AI insights. Times use your company timezone (<span className="font-medium text-on-surface">{timezone}</span>).</p>
        <Toggle name="enabled" defaultChecked={settings.enabled} label="Enable automated reports" disabled={d} />
      </div>

      {/* Daily + Weekly */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
          <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wide mb-2">Daily</h4>
          <Toggle name="daily_enabled" defaultChecked={settings.dailyEnabled} label="Send a daily report" disabled={d} />
          <label className="block mt-3">
            <span className="font-label-md text-label-md text-on-surface-variant">Time</span>
            <input type="time" name="daily_time" defaultValue={settings.dailyTime} disabled={d} className={field} />
          </label>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
          <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wide mb-2">Weekly</h4>
          <Toggle name="weekly_enabled" defaultChecked={settings.weeklyEnabled} label="Send a weekly report" disabled={d} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="block">
              <span className="font-label-md text-label-md text-on-surface-variant">Day</span>
              <select name="weekly_dow" defaultValue={String(settings.weeklyDow)} disabled={d} className={`${field} appearance-none`}>
                {DOW.map((n, i) => <option key={i} value={i}>{n}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="font-label-md text-label-md text-on-surface-variant">Time</span>
              <input type="time" name="weekly_time" defaultValue={settings.weeklyTime} disabled={d} className={field} />
            </label>
          </div>
        </div>
      </div>

      {/* Delivery */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
        <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wide mb-2">Delivery</h4>
        <Toggle name="deliver_inapp" defaultChecked={settings.deliverInApp} label="In-app" desc="Saved to Reports → AI history." disabled={d} />
        <Toggle name="deliver_whatsapp" defaultChecked={settings.deliverWhatsapp} label="WhatsApp" desc="A concise summary to the number below." disabled={d} />
        <Toggle name="deliver_email" defaultChecked={settings.deliverEmail} label="Email" desc="A formatted report emailed to your inbox (Gmail / SMTP)." disabled={d} />
        <div className="mt-3 max-w-md">
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant">WhatsApp number</span>
            <input type="tel" name="whatsapp_number" defaultValue={settings.whatsappNumber ?? ""} placeholder="+252..." disabled={d} className={field} />
          </label>
          {(() => { const st = WA_STATUS[settings.whatsappStatus] ?? WA_STATUS.not_configured; return (
            <span className="mt-1 flex items-center gap-1 font-body-sm text-body-sm">
              <Icon name={st.icon} size={14} className={st.cls} />
              <span className={st.cls}>WhatsApp: {st.label}</span>
            </span>
          ); })()}
          {canManage && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button type="button" onClick={testWhatsApp} disabled={testing} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high disabled:opacity-60">
                <Icon name={testing ? "hourglass_empty" : "send"} size={16} /> {testing ? "Sending…" : "Send test message"}
              </button>
              {testMsg && (
                <span className={`font-body-sm text-body-sm flex items-center gap-1 ${testMsg.ok ? "text-primary" : "text-error"}`}>
                  <Icon name={testMsg.ok ? "check_circle" : "error"} size={15} /> {testMsg.text}
                </span>
              )}
            </div>
          )}
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Save the number first, then send a test. It sends only if the server has a WhatsApp provider configured (env vars) — otherwise it says “Not configured”, never fakes success.</p>
        </div>

        {/* Email (SMTP) settings — configurable in-app */}
        <div className="mt-4 pt-4 border-t border-outline-variant max-w-lg">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="mail" size={16} className="text-on-surface-variant" />
            <span className="font-label-md text-label-md text-on-surface">Email (SMTP) settings</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block col-span-2 sm:col-span-1">
              <span className="font-label-md text-label-md text-on-surface-variant">SMTP host</span>
              <input type="text" name="email_smtp_host" defaultValue={settings.emailSmtpHost ?? "smtp.gmail.com"} placeholder="smtp.gmail.com" disabled={d} className={field} />
            </label>
            <label className="block col-span-1 sm:col-span-1">
              <span className="font-label-md text-label-md text-on-surface-variant">Port</span>
              <input type="number" name="email_smtp_port" defaultValue={settings.emailSmtpPort ?? 465} placeholder="465" disabled={d} className={field} />
            </label>
            <label className="block col-span-2">
              <span className="font-label-md text-label-md text-on-surface-variant">Email address (Gmail / SMTP username)</span>
              <input type="email" name="email_smtp_user" defaultValue={settings.emailSmtpUser ?? ""} placeholder="you@gmail.com" disabled={d} className={field} />
            </label>
            <label className="block col-span-2">
              <span className="font-label-md text-label-md text-on-surface-variant">App Password</span>
              <input type="password" name="email_smtp_pass" defaultValue="" autoComplete="new-password" placeholder={settings.emailHasPassword ? "•••••••••••• (saved — leave blank to keep)" : "16-character Gmail App Password"} disabled={d} className={field} />
            </label>
            <label className="block col-span-2">
              <span className="font-label-md text-label-md text-on-surface-variant">Send reports to</span>
              <input type="email" name="email_to" defaultValue={settings.emailTo ?? ""} placeholder="where to deliver reports" disabled={d} className={field} />
            </label>
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" name="email_smtp_secure" defaultChecked={settings.emailSmtpSecure} disabled={d} className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span className="font-body-sm text-body-sm text-on-surface-variant">Use SSL/TLS (on for port 465, off for 587)</span>
          </label>
          {(() => { const st = EMAIL_STATUS[settings.emailStatus] ?? EMAIL_STATUS.not_configured; return (
            <span className="mt-2 flex items-center gap-1 font-body-sm text-body-sm">
              <Icon name={st.icon} size={14} className={st.cls} />
              <span className={st.cls}>Email: {st.label}</span>
            </span>
          ); })()}
          {canManage && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button type="button" onClick={testEmail} disabled={emailing} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high disabled:opacity-60">
                <Icon name={emailing ? "hourglass_empty" : "outgoing_mail"} size={16} /> {emailing ? "Sending…" : "Send test email"}
              </button>
              {emailMsg && (
                <span className={`font-body-sm text-body-sm flex items-center gap-1 ${emailMsg.ok ? "text-primary" : "text-error"}`}>
                  <Icon name={emailMsg.ok ? "check_circle" : "error"} size={15} /> {emailMsg.text}
                </span>
              )}
            </div>
          )}
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Gmail: enable 2-Step Verification, then create an App Password (myaccount.google.com/apppasswords) and paste it above. <b>Save settings first</b>, then send a test. The password is stored securely and never shown again.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 shadow-sm">
            <Icon name={pending ? "hourglass_empty" : "save"} size={18} /> {pending ? "Saving…" : "Save settings"}
          </button>
        )}
        <button type="button" onClick={() => runNow("daily")} disabled={gen} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high disabled:opacity-60">
          <Icon name={gen ? "hourglass_empty" : "bolt"} size={18} /> Generate today’s report
        </button>
        <button type="button" onClick={() => runNow("weekly")} disabled={gen} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high disabled:opacity-60">
          <Icon name="calendar_view_week" size={18} /> Generate this week’s report
        </button>
        {msg && (
          <span className={`font-body-sm text-body-sm flex items-center gap-1 ${msg.ok ? "text-primary" : "text-error"}`}>
            <Icon name={msg.ok ? "check_circle" : "error"} size={16} /> {msg.text}
          </span>
        )}
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        “Generate now” runs the same engine the scheduler uses, for the current period, so you can test immediately. Numbers are computed from your live data; AI only writes the insights.
      </p>
    </form>
  );
}
