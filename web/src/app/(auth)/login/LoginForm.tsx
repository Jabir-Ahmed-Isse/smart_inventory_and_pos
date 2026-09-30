"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signIn(formData: FormData) {
    setError(null);
    setSubmitting(true);
    const { error: authError } = await createClient().auth.signInWithPassword({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return <>
    {error && <div className="mb-md rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">{error}</div>}
    <form action={signIn} className="space-y-md">
      <Field id="email" label="Work Email" icon="mail" type="email" placeholder="admin@company.com" />
      <Field id="password" label="Password" icon="lock" type="password" placeholder="••••••••" />
      <div className="flex items-center justify-between mt-sm"><div className="flex items-center"><input className="h-4 w-4 text-primary-container focus:ring-primary-container border-outline-variant rounded bg-surface" id="remember-me" name="remember-me" type="checkbox" /><label className="ml-2 block font-body-sm text-body-sm text-on-surface-variant" htmlFor="remember-me">Remember me</label></div><a className="font-label-md text-label-md text-primary hover:text-on-primary-container transition-colors" href="#">Forgot password?</a></div>
      <div className="mt-lg"><button className="w-full flex justify-center py-sm px-4 border border-transparent rounded-lg shadow-sm font-label-md text-label-md text-on-primary bg-primary-container hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container transition-colors active:scale-[0.98] disabled:cursor-wait disabled:opacity-70" disabled={submitting} type="submit">{submitting ? "Signing in…" : "Sign in to Workspace"}</button></div>
    </form>
  </>;
}

function Field({ id, label, icon, type, placeholder }: { id: string; label: string; icon: string; type: string; placeholder: string }) {
  return <div><label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor={id}>{label}</label><div className="relative"><span className="absolute inset-y-0 left-0 pl-sm flex items-center text-outline pointer-events-none"><Icon name={icon} size={20} /></span><input className="block w-full pl-[36px] pr-sm py-sm rounded-lg border-outline-variant bg-surface text-on-surface focus:border-primary-container focus:ring-primary-container font-body-sm text-body-sm shadow-sm transition-shadow hover:bg-surface-container-low" id={id} name={id} placeholder={placeholder} required type={type} /></div></div>;
}
