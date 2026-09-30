"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { LogoUploader } from "./LogoUploader";
import { updateOrgProfile } from "@/lib/settings/actions";
import type { OrgProfile } from "@/lib/org";

const field =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60";
const label = "block font-label-md text-label-md text-on-surface-variant mb-xs";

function Field({ name, label: l, defaultValue, placeholder, type = "text", disabled, required }: {
  name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; disabled?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className={label} htmlFor={`cp-${name}`}>{l}{required && " *"}</label>
      <input id={`cp-${name}`} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} disabled={disabled} required={required} className={field} />
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-outline-variant rounded-xl p-md md:p-lg shadow-sm">
      <div className="flex items-start gap-3 mb-md">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon name={icon} size={18} /></div>
        <div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface">{title}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function CompanyProfileForm({ profile, canManage }: { profile: OrgProfile; canManage: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const d = !canManage;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !formRef.current) return;
    const fd = new FormData(formRef.current);
    start(async () => {
      const res = await updateOrgProfile(fd);
      setMsg(res.ok ? { ok: true, text: "Company details saved." } : { ok: false, text: res.error });
    });
  }

  return (
    <form ref={formRef} onSubmit={save} className="space-y-lg">
      <Section icon="palette" title="Branding" desc="Your logo and public company name — shown across the app.">
        <div className="mb-lg"><LogoUploader name={profile.name} logoUrl={profile.logoUrl} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <Field name="name" label="Company name" defaultValue={profile.name} placeholder="Horizon Trading Co." disabled={d} required />
          <Field name="legal_name" label="Legal / registered name" defaultValue={profile.legalName} placeholder="Horizon Trading Company Ltd." disabled={d} />
        </div>
        <div className="mt-md">
          <Field name="tagline" label="Tagline / slogan" defaultValue={profile.tagline} placeholder="Inventory Pro" disabled={d} />
          <p className="mt-xs text-[11px] text-on-surface-variant">Shown under your company name in the sidebar and on the POS bar. Leave blank to use the default.</p>
        </div>
      </Section>

      <Section icon="badge" title="Company details" desc="Legal identity used on invoices and reports.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          <Field name="industry" label="Industry" defaultValue={profile.industry} placeholder="Wholesale &amp; Retail" disabled={d} />
          <Field name="registration_number" label="Registration no." defaultValue={profile.registrationNumber} placeholder="Company reg. number" disabled={d} />
          <Field name="tax_id" label="Tax / VAT ID" defaultValue={profile.taxId} placeholder="Tax identification number" disabled={d} />
        </div>
      </Section>

      <Section icon="contact_mail" title="Contact" desc="How customers and suppliers reach your company.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          <Field name="email" label="Email" type="email" defaultValue={profile.email} placeholder="info@company.com" disabled={d} />
          <Field name="phone" label="Phone" defaultValue={profile.phone} placeholder="+252 ..." disabled={d} />
          <Field name="website" label="Website" defaultValue={profile.website} placeholder="https://company.com" disabled={d} />
        </div>
      </Section>

      <Section icon="location_on" title="Registered address" desc="Head-office address for documents and correspondence.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div className="sm:col-span-2"><Field name="address_line1" label="Address line 1" defaultValue={profile.addressLine1} placeholder="Street address" disabled={d} /></div>
          <div className="sm:col-span-2"><Field name="address_line2" label="Address line 2" defaultValue={profile.addressLine2} placeholder="Building, suite (optional)" disabled={d} /></div>
          <Field name="city" label="City" defaultValue={profile.city} placeholder="Mogadishu" disabled={d} />
          <Field name="state_region" label="State / Region" defaultValue={profile.stateRegion} placeholder="Banadir" disabled={d} />
          <Field name="postal_code" label="Postal code" defaultValue={profile.postalCode} placeholder="00000" disabled={d} />
          <Field name="country" label="Country" defaultValue={profile.country} placeholder="Somalia" disabled={d} />
        </div>
      </Section>

      <Section icon="public" title="Regional" desc="Currency, timezone and default tax rate.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          <Field name="currency" label="Currency (ISO)" defaultValue={profile.currency} placeholder="USD" disabled={d} />
          <Field name="timezone" label="Timezone" defaultValue={profile.timezone} placeholder="UTC" disabled={d} />
          <div>
            <label className={label} htmlFor="cp-tax_rate">Default tax rate (%)</label>
            <input id="cp-tax_rate" name="tax_rate" type="number" min="0" step="0.01" defaultValue={profile.taxRate} disabled={d} className={field} />
          </div>
        </div>
      </Section>

      {canManage && (
        <div className="flex items-center justify-end gap-md sticky bottom-0 bg-gradient-to-t from-surface-container-low via-surface-container-low to-transparent py-3">
          {msg && (
            <span className={`font-body-sm text-body-sm flex items-center gap-1 ${msg.ok ? "text-primary" : "text-error"}`}>
              <Icon name={msg.ok ? "check_circle" : "error"} size={16} /> {msg.text}
            </span>
          )}
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            <Icon name={pending ? "hourglass_empty" : "save"} size={18} /> {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}
      {!canManage && (
        <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1"><Icon name="lock" size={16} /> Only owners and admins can edit company info.</p>
      )}
    </form>
  );
}
