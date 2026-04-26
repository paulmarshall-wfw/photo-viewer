import { useState, useMemo, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PeopleTag } from '@photo-viewer/shared';
import { useAllPeopleTags, usePhotoTags, useAddPeopleTag, useRemovePeopleTag } from '../../hooks/usePeopleTags.js';

interface PeopleTagInputProps {
  photoId: string;
}

export function PeopleTagInput({ photoId }: PeopleTagInputProps) {
  const photoTagsQ = usePhotoTags(photoId);
  const allTagsQ = useAllPeopleTags();
  const addMut = useAddPeopleTag(photoId);
  const removeMut = useRemovePeopleTag(photoId);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const photoTags: PeopleTag[] = photoTagsQ.data?.tags || [];
  const allTags: PeopleTag[] = allTagsQ.data?.tags || [];

  const photoTagIds = new Set(photoTags.map(t => t.id));

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return allTags
      .filter(t => !photoTagIds.has(t.id) && t.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [value, allTags, photoTagIds]);

  const exactMatch = allTags.some(t => t.name.toLowerCase() === value.trim().toLowerCase());
  const showCreate = value.trim().length > 0 && !exactMatch;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const addTag = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addMut.mutate(trimmed);
    setValue('');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {photoTags.map(tag => (
          <span
            key={tag.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px',
              borderRadius: 9999,
              background: 'var(--bg-tertiary)',
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
          >
            {tag.name}
            <button
              onClick={() => removeMut.mutate(tag.id)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center',
              }}
              aria-label={`Remove ${tag.name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions[0]) addTag(suggestions[0].name);
            else if (showCreate) addTag(value);
          }
        }}
        placeholder="Tag a person…"
        style={{
          width: '100%',
          fontSize: 13,
          padding: '6px 10px',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: 'none',
          fontFamily: 'inherit',
        }}
      />

      {focused && (suggestions.length > 0 || showCreate) && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          overflow: 'hidden',
        }}>
          {suggestions.map(s => (
            <button
              key={s.id}
              onClick={() => addTag(s.name)}
              style={{
                display: 'block', width: '100%', padding: '8px 12px',
                fontSize: 13, textAlign: 'left', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              {s.name}
            </button>
          ))}
          {showCreate && (
            <button
              onClick={() => addTag(value)}
              style={{
                display: 'block', width: '100%', padding: '8px 12px',
                fontSize: 13, textAlign: 'left', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
                fontStyle: 'italic',
              }}
            >
              Create "{value.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
