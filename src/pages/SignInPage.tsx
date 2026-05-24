import { useState } from 'react';
import { useAuth } from '../state/AuthContext';
import './SignInPage.css';

export default function SignInPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim();
    if (!normalized) {
      setError('Enter a name or email to continue.');
      return;
    }
    signIn(normalized);
  }

  return (
    <div className="signin-fatal">
      <div className="signin-bg-rings" aria-hidden="true">
        <div className="signin-ring signin-ring--outer" />
        <div className="signin-ring signin-ring--mid" />
        <div className="signin-ring signin-ring--inner" />
      </div>

      <div className="signin-panel">
        <div className="signin-header">
          <div className="signin-lockup">
            <span className="signin-kicker">ABEL</span>
            <span className="signin-kicker-sub">OPERATING SYSTEM</span>
          </div>
          <h1 className="signin-title">Enter your universe.</h1>
          <p className="signin-desc">
            Sign in to your private memory OS. Everything stays local and encrypted in your browser.
          </p>
        </div>

        <form className="signin-form" onSubmit={submit}>
          <input
            className="signin-input"
            type="text"
            placeholder="Your name or email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            autoFocus
            autoComplete="email"
          />
          {error && <span className="signin-error">{error}</span>}
          <button className="signin-submit" type="submit" disabled={!email.trim()}>
            <span>Enter Abel</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        <p className="signin-footer">
          No account needed. Your data never leaves this device.
        </p>
      </div>
    </div>
  );
}
