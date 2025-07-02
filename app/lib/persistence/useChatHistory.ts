import { useLoaderData, useNavigate } from '@remix-run/react';
import { atom } from 'nanostores';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMessages, getNextId, getUrlId, openDatabase, setMessages } from './db';
import { workbenchStore } from '~/lib/stores/workbench';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: ChatMessage[];
  timestamp: string;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const db = persistenceEnabled ? await openDatabase() : undefined;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

function toChatMessages(messages: any[]): ChatMessage[] {
  return (messages || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m, i) => ({
      id: m.id || `${m.role}-${i}-${Date.now()}`,
      role: m.role,
      content: m.content,
    }));
}

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();

  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  useEffect(() => {
    if (!db) {
      setReady(true);

      if (persistenceEnabled) {
        toast.error(`Chat persistence is unavailable`);
      }

      return;
    }

    if (mixedId) {
      getMessages(db, mixedId)
        .then((storedMessages) => {
          if (storedMessages && storedMessages.messages.length > 0) {
            setInitialMessages(toChatMessages(storedMessages.messages));
            setUrlId(storedMessages.urlId);
            description.set(storedMessages.description);
            chatId.set(storedMessages.id);
          } else {
            navigate(`/`, { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    }
  }, []);

  return {
    ready: !mixedId || ready,
    initialMessages,
    storeMessageHistory: async (messages: ChatMessage[]) => {
      if (!db || messages.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;

      if (!urlId && firstArtifact?.id) {
        const urlId = await getUrlId(db, firstArtifact.id);

        navigateChat(urlId);
        setUrlId(urlId);
      }

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      if (initialMessages.length === 0 && !chatId.get()) {
        const nextId = await getNextId(db);

        chatId.set(nextId);

        if (!urlId) {
          navigateChat(nextId);
        }
      }

      await setMessages(db, chatId.get() as string, messages, urlId, description.get());
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}

export async function updateChatDescription(newDescription: string) {
  if (!db || !chatId.get()) return;
  // Get current chat item
  const item = await getMessages(db, chatId.get()!);
  if (!item) return;
  // Update description in DB
  await setMessages(db, chatId.get()!, item.messages, item.urlId, newDescription);
  // Update atom
  description.set(newDescription);
}
