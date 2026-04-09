import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { StoryEntry, User } from '@photo-viewer/shared';

interface StoryEditorProps {
  entries: StoryEntry[];
  currentUser: User;
  onAdd: (content: string) => void;
  onEdit: (index: number, content: string) => void;
  onDelete: (index: number) => void;
}

export function StoryEditor({ entries, currentUser, onAdd, onEdit, onDelete }: StoryEditorProps) {
  const [newStory, setNewStory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newStoryRef = useRef(newStory);
  newStoryRef.current = newStory;
  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;

  // Auto-save unsaved story text when component unmounts (e.g. navigating to another photo)
  useEffect(() => {
    return () => {
      if (newStoryRef.current.trim()) {
        onAddRef.current(newStoryRef.current.trim());
      }
    };
  }, []);

  const handleAdd = useCallback(() => {
    if (!newStory.trim()) return;
    onAdd(newStory.trim());
    setNewStory('');
    // Blur the textarea so focus is removed after submitting
    textareaRef.current?.blur();
  }, [newStory, onAdd]);

  const startEdit = (entry: StoryEntry) => {
    setEditingIndex(entry.index);
    setEditDraft(entry.content);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editDraft.trim()) {
      onEdit(editingIndex, editDraft.trim());
    }
    setEditingIndex(null);
    setEditDraft('');
  };

  const canModify = (entry: StoryEntry) => {
    return entry.author === currentUser.displayName || currentUser.role === 'admin';
  };

  return (
    <div>
      <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stories</h3>

      {entries.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
          No stories yet. Be the first to add one!
        </p>
      )}

      {entries.map((entry) => (
        <div
          key={entry.index}
          style={{
            marginBottom: 16,
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {entry.author} {entry.date && `— ${entry.date}`}
            </div>
            {canModify(entry) && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '2px 4px' }}
                  onClick={() => startEdit(entry)}
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '2px 4px' }}
                  onClick={() => { if (confirm('Delete this story entry?')) onDelete(entry.index); }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>

          {editingIndex === entry.index ? (
            <div>
              <textarea
                className="input"
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={4}
                style={{ resize: 'vertical', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={saveEdit}>
                  Save
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEditingIndex(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {entry.content}
            </div>
          )}
        </div>
      ))}

      {/* Add new story */}
      <div style={{ marginTop: 12 }}>
        <textarea
          ref={textareaRef}
          className="input"
          placeholder="Share your memory of this photo..."
          value={newStory}
          onChange={(e) => setNewStory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleAdd();
            }
          }}
          rows={3}
          style={{ resize: 'vertical', marginBottom: 8 }}
        />
        {newStory.trim() && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            Press ⌘Enter to submit
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={!newStory.trim()}
          style={{ fontSize: 13 }}
        >
          <Plus size={14} /> Add Story
        </button>
      </div>
    </div>
  );
}
