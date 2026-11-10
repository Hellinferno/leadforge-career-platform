import {env} from 'cloudflare:workers';
import {getCurrentUser} from '../auth';

export const dynamic = 'force-dynamic';

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const isRegister = params.tab === 'register';

  const errors: Record<string, string> = {
    invalid: 'Invalid email or password. Please try again.',
    invalid_email: 'Please enter a valid email address.',
    password_length: 'Choose a password with at least 8 characters.',
    email_exists: 'An account with this email already exists. Try signing in.',
    limit: 'Too many attempts. Wait up to 15 minutes before trying again.',
    setup: 'Server setup required. Database or session key is missing.',
    unavailable: 'Service is temporarily unavailable. Please try again.',
  };

  return (
    <main className="standalone-login">
      <section>
        <a className="brand" href="/">
          leadforge<span className="brand-dot">.</span>
        </a>
        <span className="login-kicker">YOUR CAREER ACCELERATOR & REFERRAL HUB</span>
        <h1>
          {user
            ? `Welcome back, ${user.displayName}!`
            : isRegister
            ? 'Create your free account.'
            : 'Sign in to your workspace.'}
        </h1>
        <p>
          ATS Resume builder, live tech openings, and company referral matcher.
        </p>

        {user ? (
          <>
            <a className="button primary" href="/">
              Open workspace
            </a>
            <form method="post" action="/api/auth/logout">
              <button className="text-button">Sign out</button>
            </form>
          </>
        ) : (
          <>
            <div className="login-nav-tabs">
              <a
                href="/login"
                className={`login-nav-tab ${!isRegister ? 'active' : ''}`}
              >
                Sign In
              </a>
              <a
                href="/login?tab=register"
                className={`login-nav-tab ${isRegister ? 'active' : ''}`}
              >
                Create Account
              </a>
            </div>

            {isRegister ? (
              <form method="post" action="/api/auth/register">
                <label>
                  Full name
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    placeholder="e.g. Priya Sharma"
                    maxLength={100}
                    autoFocus
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  Choose a password
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={256}
                    placeholder="At least 8 characters"
                  />
                </label>
                {params.error && (
                  <p className="error" role="alert">
                    {errors[params.error] || 'Registration could not finish. Please try again.'}
                  </p>
                )}
                <button className="button primary" type="submit">
                  Create account & launch workspace
                </button>
                <small>
                  Already have an account?{' '}
                  <a href="/login" style={{ textDecoration: 'underline' }}>
                    Sign in here
                  </a>
                </small>
              </form>
            ) : (
              <form method="post" action="/api/auth/login">
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com (or leave blank for admin)"
                    autoFocus
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    maxLength={256}
                    placeholder="Your account or owner password"
                  />
                </label>
                {params.error && (
                  <p className="error" role="alert">
                    {errors[params.error] || 'Sign-in could not finish. Please try again.'}
                  </p>
                )}
                <button className="button primary" type="submit">
                  Sign in
                </button>
                <small>
                  New here?{' '}
                  <a href="/login?tab=register" style={{ textDecoration: 'underline' }}>
                    Create a free account
                  </a>
                </small>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
