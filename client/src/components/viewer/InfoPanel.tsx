import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Photo, User, StoryEntry } from '@photo-viewer/shared';
import { InlineEdit } from './InlineEdit.js';
import { StoryEditor } from './StoryEditor.js';
import { useToast } from '../shared/Toast.js';

interface InfoPanelProps {
  photo: Photo;
  currentUser: User;
  onClose: () => void;
  onPhotoUpdate: (updates: Partial<Photo>) => void;
}

const BASE = '/api';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
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

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          Date
        </label>
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
          <div
            onClick={() => setEditingDate(true)}
            style={{ fontSize: 14, cursor: 'pointer', padding: '4px 0', color: date ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {date ? formatDateForDisplay(date) : 'Add date...'}
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          Time
        </label>
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
          <div
            onClick={() => setEditingTime(true)}
            style={{ fontSize: 14, cursor: 'pointer', padding: '4px 0', color: time ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {time ? formatTimeForDisplay(time) : 'Add time...'}
          </div>
        )}
      </div>

      {editedBy && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Edited by {editedBy}
        </div>
      )}
    </div>
  );
}

export function InfoPanel({ photo, currentUser, onClose, onPhotoUpdate }: InfoPanelProps) {
  const queryClient = useQueryClient();
  const { showError } = useToast();

  const storyQuery = useQuery<{ entries: StoryEntry[] }>({
    queryKey: ['story', photo.id],
    queryFn: () => fetchJson(`/photos/${photo.id}/story`),
  });

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

  const addStory = useMutation({
    mutationFn: (content: string) =>
      fetchJson(`/photos/${photo.id}/story`, { method: 'POST', body: JSON.stringify({ content }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story', photo.id] }),
    onError: () => showError('Failed to save story'),
  });

  const editStory = useMutation({
    mutationFn: ({ index, content }: { index: number; content: string }) =>
      fetchJson(`/photos/${photo.id}/story/${index}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story', photo.id] }),
    onError: () => showError('Failed to update story'),
  });

  const deleteStory = useMutation({
    mutationFn: (index: number) =>
      fetchJson(`/photos/${photo.id}/story/${index}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story', photo.id] }),
    onError: () => showError('Failed to delete story'),
  });

  const meta = metadataQuery.data?.metadata;

  return (
    <div style={{
      width: 360,
      overflow: 'auto',
      padding: 24,
      flexShrink: 0,
      background: 'var(--bg-secondary)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Photo Information</h2>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>{photo.filename}</div>

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Title
        </label>
        <InlineEdit
          value={photo.title || ''}
          placeholder="Add a title..."
          onSave={(v) => updateTitle.mutate(v)}
          style={{ fontSize: 14 }}
        />
        {meta?.titleEditedBy && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Edited by {meta.titleEditedBy}
          </div>
        )}
      </div>

      {/* Caption */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Caption
        </label>
        <InlineEdit
          value={photo.caption || ''}
          placeholder="Add a caption..."
          onSave={(v) => updateCaption.mutate(v)}
          style={{ fontSize: 14 }}
        />
        {meta?.captionEditedBy && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Edited by {meta.captionEditedBy}
          </div>
        )}
      </div>

      {/* Date Taken */}
      <DateTimeFields
        dateTaken={photo.dateTaken || ''}
        onSave={(v) => updateDate.mutate(v)}
        editedBy={meta?.dateEditedBy}
      />

      {/* File info */}
      <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        <div>Format: {photo.format.toUpperCase()}</div>
        {photo.width && photo.height && <div>Dimensions: {photo.width} x {photo.height}</div>}
        <div>Size: {(photo.fileSize / 1024 / 1024).toFixed(1)} MB</div>
      </div>

      <div style={{ height: 1, background: 'var(--border-color)', margin: '20px 0' }} />

      {/* Stories */}
      <StoryEditor
        entries={storyQuery.data?.entries || []}
        currentUser={currentUser}
        onAdd={(content) => addStory.mutate(content)}
        onEdit={(index, content) => editStory.mutate({ index, content })}
        onDelete={(index) => deleteStory.mutate(index)}
      />
    </div>
  );
}
