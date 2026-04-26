import { useState, useEffect } from 'react';
import { X, Bell, BellOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Photo, User } from '@photo-viewer/shared';
import { InlineEdit } from './InlineEdit.js';
import { useToast } from '../shared/Toast.js';
import { ReactionBar } from '../photos/ReactionBar.js';
import { CommentThread } from '../photos/CommentThread.js';
import { PeopleTagInput } from '../photos/PeopleTagInput.js';
import { useFollowStatus, useToggleFollow } from '../../hooks/usePhotoFollow.js';

interface InfoPanelProps {
  photo: Photo;
  currentUser: User;
  onClose: () => void;
  onPhotoUpdate: (updates: Partial<Photo>) => void;
}

const BASE = '/api';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { ...headers, ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

function parseDateTaken(dateTaken: string): { date: string; time: string } {
  if (!dateTaken) return { date: '', time: '' };
  // Handle ISO format: 2024-03-15T14:30:00, or "2024-03-15 14:30:00", or just "2024-03-15"
  const cleaned = dateTaken.replace('T', ' ').trim();
  const spaceIdx = cleaned.indexOf(' ');
  if (spaceIdx === -1) return { date: cleaned, time: '' };
  return { date: cleaned.slice(0, spaceIdx), time: cleaned.slice(spaceIdx + 1) };
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  // Try to parse and format nicely
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTimeForDisplay(timeStr: string): string {
  if (!timeStr) return '';
  // Parse HH:MM:SS or HH:MM and format as 12h
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

function combineDatetime(date: string, time: string): string {
  if (!date) return '';
  if (!time) return date;
  return `${date}T${time}`;
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 2,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

function InfoField({ label, editedBy, children }: { label: string; editedBy?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
      {editedBy && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Edited by {editedBy}</div>
      )}
    </div>
  );
}

function DateTimeFields({ dateTaken, onSave, editedBy }: { dateTaken: string; onSave: (v: string) => void; editedBy?: string }) {
  const { date, time } = parseDateTaken(dateTaken);
  const [editingDate, setEditingDate] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [dateValue, setDateValue] = useState(date);
  const [timeValue, setTimeValue] = useState(time);

  useEffect(() => {
    const parsed = parseDateTaken(dateTaken);
    setDateValue(parsed.date);
    setTimeValue(parsed.time);
  }, [dateTaken]);

  const saveDate = (newDate: string) => {
    setEditingDate(false);
    if (newDate !== date) {
      onSave(combineDatetime(newDate, timeValue));
    }
  };

  const saveTime = (newTime: string) => {
    setEditingTime(false);
    if (newTime !== time) {
      onSave(combineDatetime(dateValue, newTime));
    }
  };

  const fieldStyle: React.CSSProperties = {
    fontSize: 14,
    padding: '4px 8px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    width: '100%',
  };

  const displayStyle: React.CSSProperties = { fontSize: 13, cursor: 'pointer', padding: 0 };

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <label style={LABEL_STYLE}>Date</label>
        {editingDate ? (
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            onBlur={() => saveDate(dateValue)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveDate(dateValue); if (e.key === 'Escape') { setDateValue(date); setEditingDate(false); } }}
            style={fieldStyle}
            autoFocus
          />
        ) : (
          <div onClick={() => setEditingDate(true)} style={{ ...displayStyle, color: date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {date ? formatDateForDisplay(date) : 'Add date...'}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <label style={LABEL_STYLE}>Time</label>
        {editingTime ? (
          <input
            type="time"
            value={timeValue.slice(0, 5)}
            onChange={(e) => setTimeValue(e.target.value + (timeValue.length > 5 ? timeValue.slice(5) : ':00'))}
            onBlur={() => saveTime(timeValue)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTime(timeValue); if (e.key === 'Escape') { setTimeValue(time); setEditingTime(false); } }}
            style={fieldStyle}
            autoFocus
          />
        ) : (
          <div onClick={() => setEditingTime(true)} style={{ ...displayStyle, color: time ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {time ? formatTimeForDisplay(time) : 'Add time...'}
          </div>
        )}
        {editedBy && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Edited by {editedBy}</div>
        )}
      </div>
    </div>
  );
}

export function InfoPanel({ photo, currentUser, onClose, onPhotoUpdate }: InfoPanelProps) {
  const queryClient = useQueryClient();
  const { showError } = useToast();

  const metadataQuery = useQuery<{ metadata: any }>({
    queryKey: ['metadata', photo.id],
    queryFn: () => fetchJson(`/photos/${photo.id}/metadata`),
  });

  const updateTitle = useMutation({
    mutationFn: (title: string) =>
      fetchJson(`/photos/${photo.id}/title`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    onMutate: (title) => {
      onPhotoUpdate({ title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', photo.id] });
    },
    onError: () => showError('Failed to save title'),
  });

  const updateCaption = useMutation({
    mutationFn: (caption: string) =>
      fetchJson(`/photos/${photo.id}/caption`, { method: 'PATCH', body: JSON.stringify({ caption }) }),
    onMutate: (caption) => {
      onPhotoUpdate({ caption });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', photo.id] });
    },
    onError: () => showError('Failed to save caption'),
  });

  const updateDate = useMutation({
    mutationFn: (dateTaken: string) =>
      fetchJson(`/photos/${photo.id}/date`, { method: 'PATCH', body: JSON.stringify({ dateTaken }) }),
    onMutate: (dateTaken) => {
      onPhotoUpdate({ dateTaken });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', photo.id] });
    },
    onError: () => showError('Failed to save date'),
  });

  const updateLocation = useMutation({
    mutationFn: (location: string) =>
      fetchJson(`/photos/${photo.id}/location`, { method: 'PATCH', body: JSON.stringify({ location }) }),
    onMutate: (location) => {
      onPhotoUpdate({ location });
    },
    onError: () => showError('Failed to save location'),
  });

  const followQuery = useFollowStatus(photo.id);
  const toggleFollow = useToggleFollow(photo.id);
  const following = followQuery.data?.following ?? false;

  const meta = metadataQuery.data?.metadata;

  return (
    <div style={{
      width: 360,
      overflow: 'auto',
      padding: 24,
      flexShrink: 0,
      background: 'var(--bg-secondary)',
    }}>
      {/* Filename header + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
        <h2 style={{
          fontSize: 19,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.02em',
          lineHeight: 1.25,
          wordBreak: 'break-word',
          color: 'var(--text-primary)',
          margin: 0,
          flex: 1,
        }}>
          {photo.filename}
        </h2>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button
            className="btn btn-ghost"
            onClick={() => toggleFollow.mutate(!following)}
            title={following ? 'Unfollow' : 'Follow'}
            style={{ padding: '4px', color: following ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {following ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* File info — directly under filename */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <span>{photo.format.toUpperCase()}</span>
        {photo.width && photo.height && <><span>·</span><span>{photo.width} × {photo.height}</span></>}
        <span>·</span>
        <span>{(photo.fileSize / 1024 / 1024).toFixed(1)} MB</span>
      </div>

      {/* Reactions — directly under file info */}
      <ReactionBar photoId={photo.id} currentUserId={currentUser.id} />

      <div style={{ height: 20 }} />

      {/* Metadata — compact */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
        <InfoField label="Title" editedBy={meta?.titleEditedBy}>
          <InlineEdit
            value={photo.title || ''}
            placeholder="Add a title..."
            onSave={(v) => updateTitle.mutate(v)}
            style={{ fontSize: 13 }}
          />
        </InfoField>

        <InfoField label="Caption" editedBy={meta?.captionEditedBy}>
          <InlineEdit
            value={photo.caption || ''}
            placeholder="Add a caption..."
            onSave={(v) => updateCaption.mutate(v)}
            style={{ fontSize: 13 }}
          />
        </InfoField>

        <DateTimeFields
          dateTaken={photo.dateTaken || ''}
          onSave={(v) => updateDate.mutate(v)}
          editedBy={meta?.dateEditedBy}
        />

        <InfoField label="Location">
          <InlineEdit
            value={photo.location || ''}
            placeholder="Add a location..."
            onSave={(v) => updateLocation.mutate(v)}
            style={{ fontSize: 13 }}
          />
        </InfoField>

        <InfoField label="People">
          <PeopleTagInput photoId={photo.id} />
        </InfoField>
      </div>

      <div style={{ height: 1, background: 'var(--border-color)', margin: '20px 0' }} />

      {/* Comments */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Comments
        </label>
        <CommentThread photoId={photo.id} currentUser={currentUser} />
      </div>
    </div>
  );
}
