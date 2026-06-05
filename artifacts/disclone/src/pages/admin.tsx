import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Server,
  MessageSquare,
  Shield,
  Trash2,
  Search,
  Activity,
  Mail,
  Hash,
  Heart,
  MessagesSquare,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: number;
  username: string;
  discriminator: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  isAdmin: boolean;
  showAdminTag: boolean;
  createdAt: string;
}

interface AdminServer {
  id: number;
  name: string;
  ownerId: number;
  isPublic: boolean;
  memberCount: number;
  channelCount: number;
  createdAt: string;
}

interface AdminStats {
  users: number;
  servers: number;
  channels: number;
  messages: number;
  dms: number;
  friendships: number;
  admins: number;
}

function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => customFetch<AdminStats>("/api/admin/stats", { method: "GET" }),
  });
}

function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => customFetch<AdminUser[]>("/api/admin/users", { method: "GET" }),
  });
}

function useAdminServers() {
  return useQuery({
    queryKey: ["admin", "servers"],
    queryFn: () => customFetch<AdminServer[]>("/api/admin/servers", { method: "GET" }),
  });
}

function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      customFetch(`/api/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

function useAdminDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serverId: number) =>
      customFetch(`/api/admin/servers/${serverId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "servers"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

function useAdminDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) =>
      customFetch(`/api/admin/messages/${messageId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

function useToggleAdminTag() {
  const qc = useQueryClient();
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const currentUser = useStore((s) => s.currentUser);

  return useMutation({
    mutationFn: async (showAdminTag: boolean) => {
      const result = await customFetch("/api/auth/me/update", {
        method: "PATCH",
        body: JSON.stringify({ showAdminTag }),
      });
      return result;
    },
    onSuccess: (data: any) => {
      setCurrentUser(data);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const currentUser = useStore((s) => s.currentUser);
  const [tab, setTab] = useState<"overview" | "users" | "servers" | "messages">("overview");
  const [userSearch, setUserSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [messageId, setMessageId] = useState("");

  const { data: stats } = useAdminStats();
  const { data: users } = useAdminUsers();
  const { data: servers } = useAdminServers();
  const deleteUser = useAdminDeleteUser();
  const deleteServer = useAdminDeleteServer();
  const deleteMessage = useAdminDeleteMessage();
  const toggleTag = useToggleAdminTag();

  const isAdmin = currentUser?.isAdmin ?? false;

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <Shield className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-semibold">Admin Access Required</p>
        <p className="text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }

  const filteredUsers =
    users?.filter(
      (u) =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
    ) ?? [];

  const filteredServers =
    servers?.filter((s) => s.name.toLowerCase().includes(serverSearch.toLowerCase())) ?? [];

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border shrink-0">
        <button
          onClick={() => setLocation("/app/friends")}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Shield className="w-5 h-5 text-primary shrink-0" />
        <span className="font-semibold text-sm">Admin Panel</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-none">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
          <span className="text-xs text-muted-foreground">{currentUser?.username}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 h-10 border-b border-border shrink-0">
        {(
          [
            { id: "overview" as const, label: "Overview", icon: BarChart3 },
            { id: "users" as const, label: "Users", icon: Users },
            { id: "servers" as const, label: "Servers", icon: Server },
            { id: "messages" as const, label: "Messages", icon: MessageSquare },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {tab === "overview" && (
          <div className="p-4 space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Users" value={stats?.users ?? 0} color="bg-blue-500" />
              <StatCard icon={Server} label="Servers" value={stats?.servers ?? 0} color="bg-green-500" />
              <StatCard icon={Hash} label="Channels" value={stats?.channels ?? 0} color="bg-purple-500" />
              <StatCard icon={MessagesSquare} label="Messages" value={stats?.messages ?? 0} color="bg-orange-500" />
              <StatCard icon={Mail} label="DMs" value={stats?.dms ?? 0} color="bg-pink-500" />
              <StatCard icon={Heart} label="Friendships" value={stats?.friendships ?? 0} color="bg-rose-500" />
              <StatCard icon={Shield} label="Admins" value={stats?.admins ?? 0} color="bg-red-500" />
              <StatCard icon={Activity} label="Activity" value={stats?.users ?? 0} color="bg-cyan-500" />
            </div>

            {/* Admin Tag Toggle */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Admin Badge</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toggle whether your admin badge is visible to others in chat, member lists, and friends.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {currentUser?.showAdminTag ? "Visible" : "Hidden"}
                  </span>
                  <Switch
                    checked={currentUser?.showAdminTag ?? true}
                    onCheckedChange={(v) => toggleTag.mutate(v)}
                    disabled={toggleTag.isPending}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <div className="flex items-center gap-2 px-2 py-1 bg-background rounded border border-border">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={currentUser?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary text-white text-[10px]">
                      {currentUser?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold">{currentUser?.username}</span>
                  {currentUser?.showAdminTag && (
                    <Badge className="bg-red-500 text-white border-none text-[10px] h-4 px-1">
                      <Shield className="w-2.5 h-2.5 mr-0.5" />
                      ADMIN
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="bg-background border-border h-9"
              />
            </div>
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{user.username}</span>
                      <span className="text-xs text-muted-foreground">#{user.discriminator}</span>
                      {user.isAdmin && user.showAdminTag && (
                        <Badge className="bg-red-500 text-white border-none text-[10px] h-4 px-1">
                          <Shield className="w-2.5 h-2.5 mr-0.5" />
                          ADMIN
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        user.status === "online"
                          ? "bg-green-500"
                          : user.status === "idle"
                          ? "bg-yellow-500"
                          : user.status === "dnd"
                          ? "bg-red-500"
                          : "bg-gray-500"
                      )}
                    />
                    <span className="text-xs text-muted-foreground capitalize">{user.status}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteUser.mutate(user.id)}
                      disabled={deleteUser.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "servers" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                value={serverSearch}
                onChange={(e) => setServerSearch(e.target.value)}
                placeholder="Search servers..."
                className="bg-background border-border h-9"
              />
            </div>
            <div className="space-y-1">
              {filteredServers.map((server) => (
                <div
                  key={server.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {server.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{server.name}</span>
                      {server.isPublic && (
                        <Badge className="bg-green-500/20 text-green-500 border-none text-[10px] h-4 px-1">
                          Public
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {server.memberCount} members · {server.channelCount} channels
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteServer.mutate(server.id)}
                    disabled={deleteServer.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "messages" && (
          <div className="p-4 space-y-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">Delete Message by ID</h3>
              <div className="flex items-center gap-2">
                <Input
                  value={messageId}
                  onChange={(e) => setMessageId(e.target.value)}
                  placeholder="Enter message ID"
                  type="number"
                  className="bg-background border-border"
                />
                <Button
                  variant="destructive"
                  onClick={() => {
                    const id = parseInt(messageId, 10);
                    if (id) deleteMessage.mutate(id);
                  }}
                  disabled={!messageId || deleteMessage.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This permanently deletes the message. No undo.
              </p>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
