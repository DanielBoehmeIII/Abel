import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, RotateCcw, X } from 'lucide-react';
import { syncJobService } from '../../db/services/syncJobService';
import { DEMO_USER_ID } from '../../db/services/userService';
import type { SyncJobRecord, SyncJobStatus } from '../../db/schema';
import './SyncJobsPanel.css';

const STATUS_LABEL: Record<SyncJobStatus, string> = {
  pending:   'PENDING',
  running:   'RUNNING',
  succeeded: 'DONE',
  failed:    'FAILED',
  canceled:  'CANCELED',
};

const TYPE_LABEL: Record<string, string> = {
  memory_import:     'Memory Import',
  chat_summary:      'Chat Summary',
  graph_refresh:     'Graph Refresh',
  embedding_refresh: 'Embed Refresh',
};

function elapsed(job: SyncJobRecord): string {
  if (!job.startedAt || !job.finishedAt) return '—';
  const ms = new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function age(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function preview(value: Record<string, unknown> | undefined): string {
  if (!value) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

interface Props {
  refreshSignal?: number;
}

export default function SyncJobsPanel({ refreshSignal = 0 }: Props) {
  const [jobs,        setJobs]        = useState<SyncJobRecord[]>([]);
  const [refreshSeq,  setRefreshSeq]  = useState(0);
  const [statusFilter, setStatusFilter] = useState<SyncJobStatus | 'all'>('all');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const refresh = useCallback(() => setRefreshSeq(r => r + 1), []);

  useEffect(() => {
    let alive = true;
    syncJobService.list(
      DEMO_USER_ID,
      statusFilter === 'all' ? undefined : statusFilter
    )
      .then(r => { if (alive) setJobs(r.slice(0, 40)); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [statusFilter, refreshSeq, refreshSignal]);

  // auto-refresh every 3s if any job is pending/running
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'running');
    if (!hasActive) return;
    const id = setInterval(refresh, 3_000);
    return () => clearInterval(id);
  }, [jobs, refresh]);

  async function handleRetry(job: SyncJobRecord) {
    await syncJobService.retry(job.id);
    refresh();
  }

  async function handleCancel(job: SyncJobRecord) {
    await syncJobService.cancel(job.id);
    refresh();
  }

  const counts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="sjp">
      <div className="sjp-header">
        <span className="sjp-title">SYNC JOBS</span>
        <div className="sjp-filters">
          {(['all', 'pending', 'running', 'succeeded', 'failed', 'canceled'] as const).map(s => (
            <button
              key={s}
              className={`sjp-filter ${statusFilter === s ? 'sjp-filter--on' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s as SyncJobStatus]}
              {s !== 'all' && counts[s] ? ` (${counts[s]})` : ''}
            </button>
          ))}
        </div>
        <button className="sjp-refresh-btn" onClick={refresh} title="Refresh">
          <RefreshCw size={14} strokeWidth={1.8} />
        </button>
      </div>

      {loading && (
        <div className="sjp-empty sjp-empty--loading">
          <span className="sjp-spinner" />
          Loading jobs…
        </div>
      )}

      {error && (
        <div className="sjp-empty sjp-empty--error">
          <strong>Jobs could not load.</strong>
          <span>{error}</span>
          <button onClick={refresh}>Retry</button>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="sjp-empty">
          <span className="sjp-empty-glyph">↻</span>
          <strong>No sync jobs yet.</strong>
          <span>Queue a memory import, graph refresh, or embedding refresh to see background work here.</span>
        </div>
      )}

      {!loading && !error && (
      <div className="sjp-list">
        {jobs.map(job => (
          <div key={job.id} className={`sjp-row sjp-row--${job.status}`}>
            <div className="sjp-row-main">
              <span className={`sjp-badge sjp-badge--${job.status}`}>
                {STATUS_LABEL[job.status]}
              </span>
              <span className="sjp-type">{TYPE_LABEL[job.type] ?? job.type}</span>
              <span className="sjp-age">{age(job.createdAt)}</span>
              {job.startedAt && <span className="sjp-elapsed">{elapsed(job)}</span>}
              {job.retryCount > 0 && (
                <span className="sjp-retry-count">retry #{job.retryCount}</span>
              )}
            </div>
            {job.error && (
              <div className="sjp-error">{job.error}</div>
            )}
            {job.result && (
              <pre className="sjp-result">{preview(job.result)}</pre>
            )}
            <details className="sjp-details">
              <summary>Payload</summary>
              <pre>{preview(job.payload)}</pre>
            </details>
            <div className="sjp-actions">
              {job.status === 'failed' && (
                <button className="sjp-action-btn sjp-action-btn--retry" onClick={() => handleRetry(job)} title="Retry job">
                  <RotateCcw size={12} strokeWidth={1.8} />
                  Retry
                </button>
              )}
              {(job.status === 'pending' || job.status === 'running') && (
                <button className="sjp-action-btn sjp-action-btn--cancel" onClick={() => handleCancel(job)} title="Cancel job">
                  <X size={12} strokeWidth={1.8} />
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
