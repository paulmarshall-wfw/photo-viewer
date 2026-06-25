import { useState, useRef, useEffect } from 'react';

interface InlineEditProps {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  className?: string;
  inputClassName?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export function InlineEdit({ value, placeholder, onSave, className, inputClassName, style, inputStyle }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={inputClassName ? `input ${inputClassName}` : 'input'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        style={{ ...inputStyle }}
      />
    );
  }

  return (
    <span
      className={`${className ?? ''}${value ? '' : ' inline-edit-empty'}`.trim()}
      onClick={() => setEditing(true)}
      style={{
        cursor: 'pointer',
        borderBottom: '1px dashed transparent',
        transition: 'border-color 0.15s',
        ...style,
      }}
      title="Click to edit"
    >
      {value || <span>{placeholder}</span>}
    </span>
  );
}
