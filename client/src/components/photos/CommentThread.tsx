import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Comment, User } from '@photo-viewer/shared';
import { useComments, useAddComment, useDeleteComment } from '../../hooks/useComments.js';

interface CommentThreadProps {
  photoId: string;
  currentUser: User;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function CommentItem({
  comment,
  currentUser,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: Comment;
  currentUser: User;
  onReply?: (parentId: string, body: string) => void;
  onDelete: (id: string) => void;
  isReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState('');

  const canDelete = comment.userId === currentUser.id || currentUser.role === 'admin';

  const submitReply = () => {
    const trimmed = replyBody.trim();
    if (!trimmed || !onReply) return;
    onReply(comment.id, trimmed);
    setReplyBody('');
    setReplying(false);
  };

  return (
    <div style={{ marginLeft: isReply ? 24 : 0, marginBottom: 10 }}>
      <div style={{
        background: 'var(--bg-tertiary)',
        padding: '8px 12px',
        borderRadius: 'var(--radius)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            {comment.userDisplayName}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(comment.createdAt)}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
          {comment.body}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          {!isReply && onReply && (
            <button
              onClick={() => setReplying(r => !r)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)',
              }}
            >
              Reply
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3,
              }}
            >
              <Trash2 size={11} /> Delete
            </button>
          )}
        </div>
      </div>

      {replying && (
        <div style={{ marginLeft: 24, marginTop: 6 }}>
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            className="metadata-comment-input"
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => { setReplying(false); setReplyBody(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={submitReply} disabled={!replyBody.trim()}>Reply</button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {comment.replies.map(r => (
            <CommentItem
              key={r.id}
              comment={r}
              currentUser={currentUser}
              onDelete={onDelete}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ photoId, currentUser }: CommentThreadProps) {
  const { data } = useComments(photoId);
  const addMut = useAddComment(photoId);
  const deleteMut = useDeleteComment(photoId);
  const [body, setBody] = useState('');

  const comments = data?.comments || [];

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    addMut.mutate({ body: trimmed });
    setBody('');
  };

  const submitReply = (parentId: string, replyBody: string) => {
    addMut.mutate({ body: replyBody, parentCommentId: parentId });
  };

  return (
    <div>
      <div style={{ marginBottom: comments.length === 0 ? 0 : 12 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={comments.length === 0 ? 'Be the first to add a comment…' : 'Add a comment…'}
          rows={2}
          maxLength={500}
          className="metadata-comment-input"
        />
        {body.trim() && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-primary" onClick={submit}>Post</button>
          </div>
        )}
      </div>

      {comments.map(c => (
        <CommentItem
          key={c.id}
          comment={c}
          currentUser={currentUser}
          onReply={submitReply}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      ))}
    </div>
  );
}
