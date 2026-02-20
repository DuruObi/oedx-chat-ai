"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

type Message = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; messages: Message[] };

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId);

  // Load chats from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("oedx-chats");
    if (stored) setChats(JSON.parse(stored));
  }, []);

  // Save chats whenever they change
  useEffect(() => {
    localStorage.setItem("oedx-chats", JSON.stringify(chats));
  }, [chats]);

  const createNewChat = () => {
    const id = uuidv4();
    const newChat: Chat = { id, title: "New Chat", messages: [] };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(id);
  };

  const clearChat = (id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || !activeChatId) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedChats = chats.map((c) =>
      c.id === activeChatId ? { ...c, messages: [...c.messages, userMessage] } : c
    );
    setChats(updatedChats);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...activeChat!.messages, userMessage],
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = { role: "assistant", content: "" };

      // Add assistant placeholder
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, messages: [...c.messages, assistantMessage] }
            : c
        )
      );

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantMessage.content += decoder.decode(value);

        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? { ...c, messages: [...c.messages.slice(0, -1), assistantMessage] }
              : c
          )
        );
      }

      // Update chat title with first user message
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, title: c.messages[0]?.content.slice(0, 30) || "Chat" }
            : c
        )
      );
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 p-4 flex flex-col gap-4">
        <button
          onClick={createNewChat}
          className="bg-blue-600 px-4 py-2 rounded"
        >
          + New Chat
        </button>

        <div className="flex-1 overflow-y-auto mt-4 flex flex-col gap-2">
          {chats.map((c) => (
            <div
              key={c.id}
              className={`p-2 rounded cursor-pointer ${
                c.id === activeChatId ? "bg-blue-700" : "hover:bg-gray-800"
              }`}
            >
              <div
                className="flex justify-between items-center"
                onClick={() => setActiveChatId(c.id)}
              >
                <span>{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearChat(c.id);
                  }}
                  className="text-red-500"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col bg-black text-white">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeChat?.messages.map((m, i) => (
            <div key={i}>
              <strong>{m.role === "user" ? "You: " : "OEDX AI: "}</strong>
              {m.content}
            </div>
          ))}
          {loading && <div>OEDX AI is typing...</div>}
        </div>

        {activeChatId && (
          <form
            onSubmit={sendMessage}
            className="p-4 border-t border-gray-800 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-900 p-3 rounded-lg outline-none"
              placeholder="Ask OEDX AI anything..."
            />
            <button type="submit" className="bg-blue-600 px-6 py-3 rounded-lg">
              Send
            </button>
          </form>
        )}

        {!activeChatId && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select or create a chat to start
          </div>
        )}
      </main>
    </div>
  );
}
