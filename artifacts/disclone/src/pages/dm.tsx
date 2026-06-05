import { useRoute } from "wouter";
import { useListDMs, useListDMMessages, useSendDMMessage } from "@workspace/api-client-react";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";
import { Phone, Video, Search, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import { getSocket } from "@/lib/socket";
import { Skeleton } from "@/components/ui/skeleton";

export default function DMPage() {
  const [, params] = useRoute("/app/dms/:dmId");
  const dmId = params?.dmId ? Number(params.dmId) : null;

  const currentUser = useStore((s) => s.currentUser);
  const setSelectedDmId = useStore((s) => s.setSelectedDmId);

  useEffect(() => {
    if (dmId) {
      setSelectedDmId(dmId);
      const socket = getSocket();
      socket?.emit("dm:join", dmId);
    }
  }, [dmId, setSelectedDmId]);

  // Get DM info from the list (no dedicated getById endpoint)
  const { data: dms = [], isLoading: dmLoading } = useListDMs();
  const dm = dms.find((d) => d.id === dmId);
  const other = dm?.participants?.find((p) => p.id !== currentUser?.id);

  const { data: messages = [], isLoading: messagesLoading } = useListDMMessages(dmId!, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: !!dmId } as any,
  });

  const sendDM = useSendDMMessage();

  const handleSend = (content: string) => {
    if (!dmId) return;
    sendDM.mutate({ dmId, data: { content } });
  };

  const chatMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    author: {
      id: m.authorId,
      username: m.author?.username ?? "Unknown",
      avatarUrl: m.author?.avatarUrl,
      isAdmin: m.author?.isAdmin,
      showAdminTag: m.author?.showAdminTag,
    },
    createdAt: m.createdAt,
    updatedAt: m.editedAt ?? undefined,
  }));

  if (!dmId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a conversation
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-w-0">
      {/* DM header */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border shrink-0">
        {dmLoading ? (
          <Skeleton className="h-8 w-8 rounded-full" />
        ) : (
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={other?.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {other?.username?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm">{other?.username ?? "DM"}</span>
          {other?.isAdmin && other?.showAdminTag && (
            <Badge className="bg-red-500 text-white border-none text-[10px] h-4 px-1">
              <Shield className="w-2.5 h-2.5 mr-0.5" />
              ADMIN
            </Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Video className="w-5 h-5" />
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
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <MessageList messages={chatMessages} />
      )}

      {/* Input */}
      <MessageInput
        placeholder={`Message @${other?.username ?? "user"}`}
        onSend={handleSend}
        disabled={sendDM.isPending}
      />
    </div>
  );
}
