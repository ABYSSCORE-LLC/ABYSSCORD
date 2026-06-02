import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetServer,
  useListChannels,
  useListMembers,
  useCreateChannel,
} from "@workspace/api-client-react";
import { useStore } from "@/store/useStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  Hash,
  Volume2,
  Plus,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import UserStatusBar from "./user-status-bar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ServerPanelProps {
  serverId: number;
}

export default function ServerPanel({ serverId }: ServerPanelProps) {
  const [, setLocation] = useLocation();
  const selectedChannelId = useStore((s) => s.selectedChannelId);
  const setSelectedChannelId = useStore((s) => s.setSelectedChannelId);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const [showMembers, setShowMembers] = useState(true);

  const { data: server } = useGetServer(serverId);
  const { data: channels = [] } = useListChannels(serverId);
  const { data: members = [] } = useListMembers(serverId);
  const createChannel = useCreateChannel();

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannel.mutate(
      { serverId, data: { name: newChannelName.trim().toLowerCase().replace(/\s+/g, "-"), type: newChannelType } },
      {
        onSuccess: (ch) => {
          setShowCreateChannel(false);
          setNewChannelName("");
          setSelectedChannelId(ch.id);
          setLocation(`/app/servers/${serverId}/channels/${ch.id}`);
        },
      }
    );
  };

  return (
    <>
      <div className="w-60 bg-sidebar flex flex-col shrink-0">
        {/* Server header */}
        <button className="flex items-center justify-between px-4 h-12 border-b border-border hover:bg-accent/50 transition-colors shrink-0">
          <span className="font-semibold text-sm truncate">{server?.name}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        <ScrollArea className="flex-1 px-2 py-2">
          {/* Text channels */}
          {textChannels.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-1 py-1 group">
                <button className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  <ChevronRight className="w-3 h-3" />
                  Text Channels
                </button>
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {textChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setSelectedChannelId(ch.id);
                    setLocation(`/app/servers/${serverId}/channels/${ch.id}`);
                  }}
                  className={cn(
                    "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors group",
                    selectedChannelId === ch.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Hash className="w-4 h-4 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                  <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Voice channels */}
          {voiceChannels.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-1 py-1 group">
                <button className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  <ChevronRight className="w-3 h-3" />
                  Voice Channels
                </button>
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {voiceChannels.map((ch) => (
                <button
                  key={ch.id}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Volume2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <UserStatusBar />
      </div>

      {/* Members sidebar */}
      {showMembers && (
        <div className="w-60 bg-sidebar/50 border-l border-border shrink-0 flex flex-col">
          <ScrollArea className="flex-1 px-3 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Members — {members.length}
            </p>
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent/50 cursor-pointer group"
              >
                <div className="relative shrink-0">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={m.user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {m.user?.username?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar",
                      m.user?.status === "online"
                        ? "bg-green-500"
                        : m.user?.status === "idle"
                        ? "bg-yellow-500"
                        : m.user?.status === "dnd"
                        ? "bg-red-500"
                        : "bg-gray-500"
                    )}
                  />
                </div>
                <span className="text-sm truncate text-muted-foreground group-hover:text-foreground transition-colors">
                  {m.nickname || m.user?.username}
                </span>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}

      {/* Create channel dialog */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <button
                onClick={() => setNewChannelType("text")}
                className={cn(
                  "flex-1 flex items-center gap-2 p-3 rounded-md border transition-colors",
                  newChannelType === "text"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-muted"
                )}
              >
                <Hash className="w-4 h-4" />
                Text
              </button>
              <button
                onClick={() => setNewChannelType("voice")}
                className={cn(
                  "flex-1 flex items-center gap-2 p-3 rounded-md border transition-colors",
                  newChannelType === "voice"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-muted"
                )}
              >
                <Volume2 className="w-4 h-4" />
                Voice
              </button>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Channel Name</Label>
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
                placeholder="new-channel"
                className="mt-1 bg-background border-border"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowCreateChannel(false)}>Cancel</Button>
              <Button onClick={handleCreateChannel} disabled={createChannel.isPending}>
                Create Channel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
