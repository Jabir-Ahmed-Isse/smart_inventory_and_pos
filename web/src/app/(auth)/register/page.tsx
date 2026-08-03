import Link from "next/link";
import { Icon } from "@/components/Icon";
import { signUp } from "@/lib/auth/actions";

export const metadata = { title: "Create workspace — Inventory Pro" };

const HERO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA6YhwloNfeFVCZHYfWz4v72M-6XIsgT4YucQEKMNPOb7DUkxULH5yj0pZvBJu-jkkKi-4G3xhXOuHB13DAr6iKI1EnZl2vatfn2AXL0UsK2CoHmxgYl0ynOw7BQmAemj9rvKOtjerITMRsbd-32wf_wsNyEztwwGsdfIiayc_qL9flo4P9tOKPr3D-g55d1yES-_UI_cISymud3JeWETzlrtpHYaLJDCi-_9Y2BhZKw1Rh-KS-8hfDAfQINQeSTw7_ZLJoKaWRKFY";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="bg-background min-h-screen flex text-on-surface antialiased overflow-hidden">
      <div className="flex w-full min-h-screen">
        {/* Hero */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${HERO}')` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 to-transparent flex flex-col justify-end p-xl z-10">
            <h1 className="font-display-lg text-display-lg text-on-primary mb-md">Inventory Pro</h1>
            <p className="font-body-md text-body-md text-surface-container-low max-w-md">
              Spin up an isolated, multi-tenant workspace for your business in seconds.
              Your data stays yours.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-md sm:p-xl glass-panel relative z-20">
          <div className="w-full max-w-[420px] bg-surface rounded-xl shadow-sm border border-outline-variant p-xl">
            <div className="lg:hidden mb-lg text-center">
              <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-primary">Inventory Pro</h1>
            </div>

            <div className="mb-lg">
              <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Create your workspace</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Start managing inventory, sales and reports in minutes.
              </p>
            </div>

            {error && (
              <div className="mb-md rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">
                {error}
              </div>
            )}

            <form action={signUp} className="space-y-md">
              <Field id="full_name" label="Full Name" icon="person" type="text" placeholder="Jane Doe" />
              <Field id="company_name" label="Company / Workspace Name" icon="business" type="text" placeholder="Acme Corp Inventory" />
              <Field id="email" label="Work Email" icon="mail" type="email" placeholder="admin@company.com" />
              <Field id="password" label="Password" icon="lock" type="password" placeholder="••••••••" />

              <div className="mt-lg">
                <button
                  className="w-full flex justify-center py-sm px-4 border border-transparent rounded-lg shadow-sm font-label-md text-label-md text-on-primary bg-primary-container hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container transition-colors active:scale-[0.98]"
                  type="submit"
                >
                  Create Workspace
                </button>
              </div>
            </form>

            <div className="mt-xl text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Already have an account?{" "}
                <Link className="font-label-md text-label-md text-primary hover:text-on-primary-container transition-colors" href="/login">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  type,
  placeholder,
}: {
  id: string;
  label: string;
  icon: string;
  type: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-sm flex items-center text-outline pointer-events-none">
          <Icon name={icon} size={20} />
        </span>
        <input
          className="block w-full pl-[36px] pr-sm py-sm rounded-lg border-outline-variant bg-surface text-on-surface focus:border-primary-container focus:ring-primary-container font-body-sm text-body-sm shadow-sm transition-shadow hover:bg-surface-container-low"
          id={id}
          name={id}
          placeholder={placeholder}
          required
          type={type}
        />
      </div>
    </div>
  );
}
