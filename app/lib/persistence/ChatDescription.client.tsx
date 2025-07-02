import { useStore } from '@nanostores/react';
import { description } from './useChatHistory';
import { useState, useRef } from 'react';
import { updateChatDescription } from './useChatHistory';

export function ChatDescription() {
  const desc = useStore(description);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(desc || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep value in sync with store
  if (!editing && value !== (desc || '')) setValue(desc || '');

  const validate = (val: string) => val.trim().length >= 2;

  const handleSave = async () => {
    if (!validate(value)) {
      setError('Title must be at least 2 characters.');
      inputRef.current?.focus();
      return;
    }
    setError(null);
    if (value.trim() && value !== desc) {
      await updateChatDescription(value.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(desc || '');
      setError(null);
      setEditing(false);
    }
  };

  return editing ? (
    <div className="flex flex-col items-center w-full">
      <input
        ref={inputRef}
        className={`bg-transparent border-b text-center outline-none px-1 text-bolt-elements-textPrimary font-medium max-w-full ${error ? 'border-red-500' : 'border-accent'}`}
        value={value}
        onChange={e => {
          setValue(e.target.value);
          if (error && validate(e.target.value)) setError(null);
        }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        maxLength={60}
        style={{ minWidth: 40 }}
      />
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  ) : (
    <span
      className="cursor-pointer text-bolt-elements-textPrimary font-medium truncate inline-block max-w-full"
      title="Click to edit title"
      onClick={() => setEditing(true)}
    >
      {desc || 'Untitled Chat'}
    </span>
  );
}
