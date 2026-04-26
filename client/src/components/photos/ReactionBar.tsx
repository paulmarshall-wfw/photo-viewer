import { useState } from 'react';
import type { Reaction } from '@photo-viewer/shared';
import { useReactions, useAddReaction, useRemoveReaction } from '../../hooks/useReactions.js';

const EMOJIS = ['❤️', '😂', '😢', '😮', '🙏', '👏'];

interface ReactionBarProps {
  photoId: string;
  currentUserId: string;
}

export function ReactionBar({ photoId, currentUserId }: ReactionBarProps) {
  const { data } = useReactions(photoId);
  const addMut = useAddReaction(photoId);
  const removeMut = useRemoveReaction(photoId);
  const [showFor, setShowFor] = useState<string | null>(null);

  const reactions = data?.reactions || [];

  const byEmoji = new Map<string, Reaction[]>();
  for (const r of reactions) {
    const list = byEmoji.get(r.emoji) || [];
    list.push(r);
    byEmoji.set(r.emoji, list);
  }

  const hasMine = (emoji: string) => reactions.some(r => r.emoji === emoji && r.userId === currentUserId);

  const toggle = (emoji: string) => {
    if (hasMine(emoji)) {
      removeMut.mutate(emoji);
    } else {
      addMut.mutate(emoji);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {EMOJIS.map((emoji) => {
        const list = byEmoji.get(emoji) || [];
        const mine = hasMine(emoji);
        return (
          <div key={emoji} style={{ position: 'relative' }}>
            <button
              onClick={() => toggle(emoji)}
              onMouseEnter={() => list.length > 0 && setShowFor(emoji)}
              onMouseLeave={() => setShowFor(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 9999,
                background: mine ? 'var(--accent-soft, rgba(99,102,241,0.18))' : 'var(--bg-tertiary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-primary)',
                transition: 'background 0.15s ease',
              }}
            >
              <span>{emoji}</span>
              {list.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{list.length}</span>}
            </button>
            {showFor === emoji && list.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                background: 'var(--bg-elevated)',
                padding: '6px 10px',
                borderRadius: 'var(--radius)',
                fontSize: 11,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                zIndex: 50,
                boxShadow: 'var(--shadow-lg)',
                maxWidth: 240,
              }}>
                {list.map(r => r.userDisplayName).join(', ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
