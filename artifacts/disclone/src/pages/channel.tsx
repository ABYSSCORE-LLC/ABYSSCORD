import { useRoute } from "wouter";
import {
  useGetChannel,
  useListMessages,
  useCreateMessage,
} from "@workspace/api-client-react";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";
import { Hash, Bell, Pin, Users, Search } from "lucide-react";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import { getSocket } from "@/lib/socket";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChannelPage() {
  const [, params] = useRoute("/app/servers/:serverId/channels/:channelId");
  const channelId = params?.channelId ? Number(params.channelId) : null;
  const serverId = params?.serverId ? Number(params.serverId) : null;

  const setSelectedChannelId = useStore((s) => s.setSelectedChannelId);
  const typingUsers = useStore((s) => channelId ? (s.typingUsers[channelId] ?? []) : []);

  useEffect(() => {
    if (!channelId) return;
    setSelectedChannelId(channelId);
    const socket = getSocket();
    socket?.emit("channel:join", channelId);
    return () => {
      socket?.emit("channel:leave", channelId);
    };
  }, [channelId, setSelectedChannelId]);

  const { data: channel, isLoading: channelLoading } = useGetChannel(
    channelId!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!channelId } as any }
  );

  const { data: messages = [], isLoading: messagesLoading } = useListMessages(
    channelId!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!channelId } as any }
  );

  const createMessage = useCreateMessage();

  const handleSend = (content: string) => {
    if (!channelId) return;
    createMessage.mutate({ channelId, data: { content } });
  };

  const chatMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    author: {
      id: m.authorId,
      username: m.author?.username ?? "Unknown",
      avatarUrl: m.author?.avatarUrl,
    },
    createdAt: m.createdAt,
    updatedAt: m.editedAt ?? undefined,
    isPinned: m.isPinned,
  }));

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select a channel to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-w-0">
      {/* Channel header */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0">
        <Hash className="w-5 h-5 text-muted-foreground shrink-0" />
        {channelLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <span className="font-semibold text-sm">{channel?.name}</span>
        )}
        {channel?.topic && (
          <>
            <div className="h-5 w-[1px] bg-border mx-1" />
            <span className="text-xs text-muted-foreground truncate">{channel.topic}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Pin className="w-5 h-5" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Users className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 bg-background rounded-md px-2 py-1 w-36">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              placeholder="Search"
              className="bg-transparent text-xs text-muted-foreground outline-none w-full placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      {messagesLoading ? (
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <MessageList messages={chatMessages} typingUsers={typingUsers} />
      )}

      {/* Input */}
      <MessageInput
        placeholder={`Message #${channel?.name ?? "channel"}`}
        onSend={handleSend}
        channelId={channelId}
        disabled={createMessage.isPending}
      />
    </div>
  );
}
