import { useState, useRef, useEffect } from "react";
import { Send, Plus, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/socket";

interface MessageInputProps {
  placeholder: string;
  onSend: (content: string) => void;
  channelId?: number;
  disabled?: boolean;
}

export default function MessageInput({ placeholder, onSend, channelId, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendTyping = (typing: boolean) => {
    if (!channelId) return;
    const socket = getSocket();
    if (!socket) return;
    if (typing) {
      socket.emit("typing:start", { channelId });
    } else {
      socket.emit("typing:stop", { channelId });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 2000);

    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  };

  const handleSubmit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue("");
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    sendTyping(false);
    setIsTyping(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  return (
    <div className="px-4 pb-4 shrink-0">
      <div className="flex items-end gap-0 bg-background/80 rounded-lg border border-border overflow-hidden">
        <button className="px-3 py-3 text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Plus className="w-5 h-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground py-3 pr-2",
            "max-h-[200px] leading-relaxed"
          )}
        />
        <div className="flex items-center gap-1 px-2 py-2 shrink-0">
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className={cn(
              "p-1 rounded transition-colors",
              value.trim()
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
