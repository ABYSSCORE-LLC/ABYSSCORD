import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: number;
  content: string;
  author: {
    id: number;
    username: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
  typingUsers?: string[];
  className?: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isSameAuthorAndClose(a: ChatMessage, b: ChatMessage) {
  return (
    a.author.id === b.author.id &&
    Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < 5 * 60 * 1000
  );
}

export default function MessageList({ messages, typingUsers = [], className }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className={cn("flex-1 overflow-y-auto flex flex-col", className)}>
      <div className="flex-1" />
      <div className="px-4 py-2 space-y-0.5">
        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const isGrouped = prev && isSameAuthorAndClose(prev, msg) && isSameDay(prev.createdAt, msg.createdAt);
          const showDivider = !prev || !isSameDay(prev.createdAt, msg.createdAt);

          return (
            <div key={msg.id}>
              {showDivider && (
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-semibold shrink-0">
                    {formatDate(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div className={cn(
                "flex gap-4 group hover:bg-accent/20 rounded px-1 py-0.5 transition-colors",
                isGrouped ? "items-start" : "items-start mt-4"
              )}>
                {isGrouped ? (
                  <div className="w-10 shrink-0 flex justify-center pt-1">
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                ) : (
                  <Avatar className="w-10 h-10 shrink-0 mt-0.5">
                    <AvatarImage src={msg.author.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                      {msg.author.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  {!isGrouped && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
                        {msg.author.username}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                    </div>
                  )}
                  <p className="text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-5 pb-1 flex items-center gap-1.5">
          <div className="flex gap-0.5 items-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing…`
              : `${typingUsers.join(", ")} are typing…`}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
