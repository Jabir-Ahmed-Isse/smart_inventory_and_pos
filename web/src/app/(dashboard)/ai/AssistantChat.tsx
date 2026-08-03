"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { askAssistant } from "@/lib/ai/actions";

type Msg = { role: "user" | "assistant"; text: string; grounded?: boolean };

const SUGGESTIONS = [
  "What should I reorder?",
  "Show dead stock risk",
  "How much revenue today?",
  "Top selling products",
];

export function AssistantChat({ greeting }: { greeting: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: greeting, grounded: true },
  ]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    startTransition(async () => {
      const res = await askAssistant(q);
      setMessages((m) => [
        ...m,
        res.ok
          ? { role: "assistant", text: res.answer, grounded: res.grounded }
          : { role: "assistant", text: res.error },
      ]);
    });
  }

  return (
    <section className="flex-1 lg:max-w-2xl flex flex-col bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden h-full">
      {/* Header */}
      <div className="px-md py-sm border-b border-outline-variant bg-surface-container-lowest flex items-center gap-md">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center pulse-ring">
          <Icon name="psychology" className="text-on-primary-container" />
        </div>
        <div className="flex-1">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Intelligence Assistant
          </h2>
          <p className="font-label-md text-label-md text-on-surface-variant flex items-center gap-xs">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Grounded in your live data
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-md space-y-lg flex flex-col bg-surface-bright">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex items-start gap-md justify-end">
              <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm p-4 max-w-[85%] shadow-sm">
                <p className="font-body-md text-body-md">{m.text}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center shrink-0">
                <Icon name="person" className="text-on-surface-variant text-sm" size={16} />
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-md">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <Icon name="psychology" className="text-on-primary-container text-sm" size={16} />
              </div>
              <div className="bg-surface-container border border-outline-variant rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                <RichText text={m.text} />
              </div>
            </div>
          ),
        )}

        {pending && (
          <div className="flex items-start gap-md">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
              <Icon name="psychology" className="text-on-primary-container text-sm" size={16} />
            </div>
            <div className="bg-surface-container border border-outline-variant rounded-2xl rounded-tl-sm p-4">
              <div className="flex items-center gap-1 h-6">
                <div className="w-2 h-2 rounded-full bg-primary typing-dot" />
                <div className="w-2 h-2 rounded-full bg-primary typing-dot" />
                <div className="w-2 h-2 rounded-full bg-primary typing-dot" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !pending && (
        <div className="px-md pt-sm flex flex-wrap gap-xs">
          {SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              onClick={() => send(sug)}
              className="px-sm py-xs rounded-full border border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-md bg-surface-container-lowest border-t border-outline-variant"
      >
        <div className="relative flex items-center">
          <span className="absolute left-3 text-on-surface-variant">
            <Icon name="auto_awesome" />
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={pending}
            className="w-full pl-12 pr-12 py-3 bg-surface border border-outline-variant rounded-full font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm disabled:opacity-60"
            placeholder="Ask about inventory, forecasts, or risks..."
            type="text"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="absolute right-2 p-2 bg-primary text-on-primary rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center justify-center disabled:opacity-50"
          >
            <Icon name="send" className="text-sm" size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}

/** Minimal markdown renderer: **bold**, "- " bullets, blank lines, italics via _x_. */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (bullets.length) {
      out.push(
        <ul key={key} className="list-disc pl-5 font-body-sm text-body-sm text-on-surface-variant space-y-1">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const m = line.match(/^\s*[-•]\s+(.*)$/);
    if (m) {
      bullets.push(m[1]);
    } else {
      flush(`ul-${i}`);
      if (line.trim() === "") return;
      out.push(
        <p key={`p-${i}`} className="font-body-md text-body-md text-on-surface first:mt-0 mt-sm">
          {inline(line)}
        </p>,
      );
    }
  });
  flush("ul-end");

  return <div className="space-y-xs">{out}</div>;
}

function inline(s: string): React.ReactNode {
  // Split on **bold** and _italic_ segments.
  const parts = s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-on-surface">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("_") && p.endsWith("_")) {
      return (
        <em key={i} className="text-on-surface-variant">
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
