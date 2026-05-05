import { useState } from 'react';
import { JOURNAL_ENTRIES } from '../data';
import type { JournalEntry } from '../types';
import './JournalPage.css';

export default function JournalPage({ onBack }: { onBack?: () => void }) {
  const [selectedPath, setSelectedPath] = useState('/journal/reflections/');
  const [showPreview, setShowPreview] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<JournalEntry | null>(null);

  function handleRowClick(entry: JournalEntry) {
    setSelectedPath(entry.path);
    if (entry.isFile && entry.preview) {
      setPreviewEntry(entry);
      setShowPreview(true);
    } else {
      setShowPreview(false);
    }
  }

  return (
    <div className="journal-page">
      {/* Top header */}
      <div className="jrn-header glass">
        <div className="jrn-header-left">
          <span className="jrn-logo">Abel v0.2</span>
          <span className="jrn-commit">commit abl_2025_rev_042</span>
        </div>
        <div className="jrn-header-right">
          <span className="jrn-path-label">journal:/</span>
        </div>
      </div>

      {/* Body */}
      <div className="jrn-body">
        {/* Left profile column */}
        <div className="jrn-profile glass">
          <div className="jrn-medallion">
            <div className="medallion-inner">
              <span className="medallion-logo">▲</span>
            </div>
          </div>
          <div className="jrn-profile-name">Amina Profile</div>
          <div className="jrn-stats">
            <StatRow label="Total Entries" value="127" />
            <StatRow label="Active Streak" value="12 days" />
            <StatRow label="Tags Used" value="8" />
          </div>
        </div>

        {/* File browser */}
        <div className="jrn-browser">
          <div className="jrn-browser-heading">
            <span className="neon-cyan">journal:/</span>
          </div>
          <div className="jrn-file-list">
            {JOURNAL_ENTRIES.map(entry => (
              <div
                key={entry.path}
                className={`jrn-row ${entry.path === selectedPath ? 'selected' : ''}`}
                onClick={() => handleRowClick(entry)}
              >
                <span className="jrn-row-icon">{entry.isFile ? '▣' : '▷'}</span>
                <span className="jrn-row-path">{entry.label}</span>
                <span className="jrn-row-desc">{entry.description}</span>
                <span className="jrn-row-meta">{entry.meta}</span>
              </div>
            ))}
          </div>

          {showPreview && previewEntry?.preview && (
            <div className="jrn-preview glass2 fade-in">
              <div className="jrn-preview-header">
                <span className="jrn-preview-title neon-purple">{previewEntry.label.split('/').pop()}</span>
                <button className="jrn-close-btn" onClick={() => setShowPreview(false)}>✕</button>
              </div>
              <div className="jrn-preview-date">{previewEntry.preview.date}</div>
              <div className="jrn-preview-tags">
                {previewEntry.preview.tags.map(t => (
                  <span key={t} className="jrn-tag">{t}</span>
                ))}
              </div>
              <p className="jrn-preview-text">{previewEntry.preview.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="jrn-footer glass">
        <FooterBtn icon="⌂" label="Home" onClick={onBack} />
        <FooterBtn icon="⚙" label="Settings" />
        <FooterBtn icon="ℹ" label="Info" />
        <FooterBtn icon="↻" label="Refresh" onClick={() => setSelectedPath('/journal/daily_logs/')} />
        <FooterBtn icon="✕" label="Exit" onClick={onBack} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}:</span>
      <span className="stat-value neon-cyan">{value}</span>
    </div>
  );
}

function FooterBtn({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button className="jrn-footer-btn" onClick={onClick}>
      <span className="jrn-footer-icon">{icon}</span>
      <span className="jrn-footer-label">{label}</span>
    </button>
  );
}
