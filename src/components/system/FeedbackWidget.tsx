import { useState } from 'react';
import { appEnv } from '../../config/env';
import { trackEvent } from '../../lib/analytics';
import './SystemOverlays.css';

const FEEDBACK_KEY = 'abel_feedback_v1';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  if (!appEnv.feedbackEnabled) return null;

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const existing = JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? '[]') as unknown[];
      existing.push({
        text: trimmed,
        path: window.location.pathname,
        release: appEnv.release,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing.slice(-100)));
    } catch {
      // Feedback is best-effort local capture in beta.
    }
    trackEvent('feedback_submitted');
    setText('');
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
    }, 1800);
  }

  return (
    <div className="feedback-widget">
      {open && (
        <div className="feedback-panel">
          <p className="system-kicker">BETA FEEDBACK</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What felt broken, confusing, or useful?"
            rows={4}
          />
          {sent && <span className="feedback-sent">Saved locally.</span>}
          <div className="feedback-actions">
            <button onClick={() => setOpen(false)}>Cancel</button>
            <button onClick={submit} disabled={!text.trim()}>Send</button>
          </div>
        </div>
      )}
      <button className="feedback-tab" onClick={() => setOpen(v => !v)}>Feedback</button>
    </div>
  );
}
