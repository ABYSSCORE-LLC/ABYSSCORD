import { useState } from "react";
import {
  useListFriends,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useSendFriendRequest,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, UserPlus, Users, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "online" | "all" | "pending" | "add";

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>("online");
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const { data } = useListFriends();
  const friends = data?.friends ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();

  const pendingCount = incoming.length;
  const onlineFriends = friends.filter((f) => f.status === "online");
  const displayFriends = tab === "online" ? onlineFriends : friends;

  const handleAdd = () => {
    if (!addInput.trim()) return;
    setAddError(null);
    setAddSuccess(false);
    const username = addInput.trim();
    sendRequest.mutate(
      { data: { username } },
      {
        onSuccess: () => { setAddSuccess(true); setAddInput(""); },
        onError: (e: any) => setAddError(e?.data?.error || "Could not send friend request"),
      }
    );
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "online", label: "Online" },
    { id: "all", label: "All Friends" },
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "add", label: "Add Friend" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Users className="w-5 h-5 text-muted-foreground" />
          Friends
        </div>
        <div className="h-5 w-[1px] bg-border" />
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {t.label}
              {t.count ? (
                <Badge className="ml-2 h-4 px-1 text-xs bg-destructive text-white">
                  {t.count}
                </Badge>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "add" ? (
          <div className="max-w-xl">
            <h3 className="font-semibold text-lg mb-1">Add Friend</h3>
            <p className="text-muted-foreground text-sm mb-4">
              You can add friends with their DisClone username.
            </p>
            <div className="flex gap-2">
              <Input
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Enter a username"
                className="flex-1 bg-background border-border"
              />
              <Button onClick={handleAdd} disabled={sendRequest.isPending}>
                <UserPlus className="w-4 h-4 mr-2" />
                Send Request
              </Button>
            </div>
            {addError && <p className="text-destructive text-sm mt-2">{addError}</p>}
            {addSuccess && <p className="text-green-500 text-sm mt-2">Friend request sent!</p>}
          </div>
        ) : tab === "pending" ? (
          <div className="space-y-1">
            {incoming.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Incoming — {incoming.length}
                </p>
                {incoming.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent group">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{user.username}</p>
                      <p className="text-xs text-muted-foreground">Incoming Friend Request</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => acceptRequest.mutate({ userId: user.id })}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => declineRequest.mutate({ userId: user.id })}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive text-destructive hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {outgoing.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">
                  Outgoing — {outgoing.length}
                </p>
                {outgoing.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent group">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{user.username}</p>
                      <p className="text-xs text-muted-foreground">Outgoing Friend Request</p>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </>
            )}
            {incoming.length === 0 && outgoing.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium">No pending requests</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {tab === "online" ? "Online" : "All Friends"} — {displayFriends.length}
            </p>
            <div className="space-y-1">
              {displayFriends.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent group cursor-pointer">
                  <div className="relative">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-sidebar",
                      user.status === "online" ? "bg-green-500" :
                      user.status === "idle" ? "bg-yellow-500" :
                      user.status === "dnd" ? "bg-red-500" : "bg-gray-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFriend.mutate({ userId: user.id })}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-accent hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {displayFriends.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-medium">
                    {tab === "online" ? "No friends online" : "No friends yet"}
                  </p>
                  <p className="text-sm mt-1">
                    {tab === "online" ? "All your friends are offline." : "Add some friends to get started!"}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
