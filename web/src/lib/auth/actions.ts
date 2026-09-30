"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function configured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Design-preview mode (Supabase not configured yet): just enter the app.
  if (!configured()) redirect("/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const companyName = String(formData.get("company_name") ?? "");

  if (!configured()) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is disabled we already have a session — create the
  // organization (multi-tenant workspace) and make this user its owner.
  if (data.session) {
    const { error: orgError } = await supabase.rpc("create_organization", {
      org_name: companyName || `${fullName || "My"} Workspace`,
    });
    if (orgError) {
      redirect(`/register?error=${encodeURIComponent(orgError.message)}`);
    }
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  // Otherwise the user must confirm their email first.
  redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20account");
}

export async function signOut() {
  if (configured()) {
    const supabase = await createClient();
    // `scope: "local"` clears the session cookies for THIS browser immediately,
    // without the network round-trip to revoke the token across all devices —
    // logout feels instant. (signIn re-validates the layout cache on the next
    // login, so no stale data leaks between accounts.)
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/login");
}
