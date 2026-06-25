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
    <div ref={wrapRef} className="people-tag-control">
      {photoTags.length > 0 && (
        <div className="people-tag-list">
          {photoTags.map(tag => (
          <span
            key={tag.id}
            className="people-tag-pill"
          >
            {tag.name}
            <button
              onClick={() => removeMut.mutate(tag.id)}
              className="people-tag-remove-button"
              aria-label={`Remove ${tag.name}`}
            >
              <X size={12} />
            </button>
          </span>
          ))}
        </div>
      )}

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
        className="metadata-edit-input metadata-tag-input"
      />

      {focused && (suggestions.length > 0 || showCreate) && (
        <div className="people-tag-suggestions">
          {suggestions.map(s => (
            <button
              key={s.id}
              onClick={() => addTag(s.name)}
              className="people-tag-suggestion-button"
            >
              {s.name}
            </button>
          ))}
          {showCreate && (
            <button
              onClick={() => addTag(value)}
              className="people-tag-suggestion-button people-tag-suggestion-create"
            >
              Create "{value.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
