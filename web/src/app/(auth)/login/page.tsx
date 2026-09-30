import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — Inventory Pro" };

const HERO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA6YhwloNfeFVCZHYfWz4v72M-6XIsgT4YucQEKMNPOb7DUkxULH5yj0pZvBJu-jkkKi-4G3xhXOuHB13DAr6iKI1EnZl2vatfn2AXL0UsK2CoHmxgYl0ynOw7BQmAemj9rvKOtjerITMRsbd-32wf_wsNyEztwwGsdfIiayc_qL9flo4P9tOKPr3D-g55d1yES-_UI_cISymud3JeWETzlrtpHYaLJDCi-_9Y2BhZKw1Rh-KS-8hfDAfQINQeSTw7_ZLJoKaWRKFY";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  return (
    <div className="bg-background min-h-screen flex text-on-surface antialiased overflow-hidden">
      <div className="flex w-full h-screen">
        {/* Hero */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${HERO}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 to-transparent flex flex-col justify-end p-xl z-10">
            <h1 className="font-display-lg text-display-lg text-on-primary mb-md">
              Inventory Pro
            </h1>
            <p className="font-body-md text-body-md text-surface-container-low max-w-md">
              Enterprise-grade inventory management and point-of-sale
              intelligence. Designed for precision, built for scale.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-md sm:p-xl glass-panel relative z-20">
          <div className="w-full max-w-[420px] bg-surface rounded-xl shadow-sm border border-outline-variant p-xl">
            <div className="lg:hidden mb-lg text-center">
              <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-primary">
                Inventory Pro
              </h1>
            </div>

            <div className="mb-lg">
              <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">
                Welcome back
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Sign in to your enterprise workspace.
              </p>
            </div>

            {error && (
              <div className="mb-md rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-md rounded-lg border border-primary/30 bg-primary-container/20 px-md py-sm font-body-sm text-body-sm text-on-primary-container">
                {message}
              </div>
            )}

            <LoginForm />
            <div className="hidden">
              <Field
                id="email"
                label="Work Email"
                icon="mail"
                type="email"
                placeholder="admin@company.com"
              />
              <Field
                id="password"
                label="Password"
                icon="lock"
                type="password"
                placeholder="••••••••"
              />

              <div className="flex items-center justify-between mt-sm">
                <div className="flex items-center">
                  <input
                    className="h-4 w-4 text-primary-container focus:ring-primary-container border-outline-variant rounded bg-surface"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                  />
                  <label
                    className="ml-2 block font-body-sm text-body-sm text-on-surface-variant"
                    htmlFor="remember-me"
                  >
                    Remember me
                  </label>
                </div>
                <a
                  className="font-label-md text-label-md text-primary hover:text-on-primary-container transition-colors"
                  href="#"
                >
                  Forgot password?
                </a>
              </div>

              <div className="mt-lg">
                <button
                  className="w-full flex justify-center py-sm px-4 border border-transparent rounded-lg shadow-sm font-label-md text-label-md text-on-primary bg-primary-container hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container transition-colors active:scale-[0.98]"
                  type="submit"
                >
                  Sign in to Workspace
                </button>
              </div>
            </div>

            <div className="mt-lg mb-lg relative">
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center"
              >
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface font-label-md text-label-md text-on-surface-variant">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <SocialButton label="Google">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                </svg>
                Google
              </SocialButton>
              <SocialButton label="Microsoft">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                </svg>
                Microsoft
              </SocialButton>
            </div>

            <div className="mt-xl text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Don&apos;t have an account?{" "}
                <Link
                  className="font-label-md text-label-md text-primary hover:text-on-primary-container transition-colors"
                  href="/register"
                >
                  Create workspace
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
      <label
        className="block font-label-md text-label-md text-on-surface-variant mb-xs"
        htmlFor={id}
      >
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

function SocialButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className="w-full inline-flex justify-center py-sm px-4 border border-outline-variant rounded-lg shadow-sm bg-surface font-label-md text-label-md text-on-surface hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container transition-colors active:scale-[0.98]"
      type="button"
    >
      <span className="sr-only">Sign in with {label}</span>
      {children}
    </button>
  );
}
