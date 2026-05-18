import { useState } from 'react';
import { appEnv } from '../../config/env';
import { trackEvent } from '../../lib/analytics';
import './SystemOverlays.css';

const ACCESS_KEY = 'abel_beta_access_v1';

export default function BetaAccessGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(() => {
    if (!appEnv.betaAccessEnabled) return true;
    return localStorage.getItem(ACCESS_KEY) === 'granted';
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (allowed) return <>{children}</>;

  function submit() {
    const normalized = code.trim();
    if (appEnv.inviteCodes.includes(normalized)) {
      localStorage.setItem(ACCESS_KEY, 'granted');
      trackEvent('beta_access_granted');
      setAllowed(true);
      return;
    }
    trackEvent('beta_access_denied');
    setError('Invite code not recognized.');
  }

  return (
    <div className="system-fatal">
      <div className="system-fatal-panel system-gate-panel">
        <p className="system-kicker">CONTROLLED BETA</p>
        <h1>Abel is invite-only.</h1>
        <p>Enter the beta code provided with your invite. Access is stored locally in this browser.</p>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Invite code" autoFocus />
        {error && <span className="system-error">{error}</span>}
        <button onClick={submit}>Enter Abel</button>
      </div>
    </div>
  );
}
