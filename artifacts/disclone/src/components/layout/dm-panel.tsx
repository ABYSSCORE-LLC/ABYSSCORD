import { useLocation } from "wouter";
import { useListDMs } from "@workspace/api-client-react";
import { useStore } from "@/store/useStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Plus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import UserStatusBar from "./user-status-bar";

export default function DMPanel() {
  const [location, setLocation] = useLocation();
  const currentUser = useStore((s) => s.currentUser);
  const setSelectedDmId = useStore((s) => s.setSelectedDmId);
  const selectedDmId = useStore((s) => s.selectedDmId);

  const { data: dms = [] } = useListDMs();

  const goFriends = () => {
    setSelectedDmId(null);
    setLocation("/app/friends");
  };

  return (
    <div className="w-60 bg-sidebar flex flex-col shrink-0">
      {/* Search bar placeholder */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button className="w-full text-left px-2 py-1.5 rounded bg-background/60 text-muted-foreground text-sm">
          Find or start a conversation
        </button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {/* Friends */}
        <button
          onClick={goFriends}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors mb-1",
            location === "/app/friends" || location === "/"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <Users className="w-5 h-5 shrink-0" />
          Friends
        </button>

        {/* Admin Panel */}
        {currentUser?.isAdmin && (
          <button
            onClick={() => {
              setSelectedDmId(null);
              setLocation("/app/admin");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors mb-1",
              location === "/app/admin"
                ? "bg-red-500/20 text-red-400"
                : "text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
            )}
          >
            <Shield className="w-5 h-5 shrink-0" />
            Admin Panel
          </button>
        )}

        {/* DMs — participants is User[], find the other person */}
        {dms.length > 0 && (
          <div className="mt-2 mb-1">
            <div className="flex items-center justify-between px-2 mb-1 group">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Direct Messages
              </span>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {dms.map((dm) => {
              const other = dm.participants?.find((p) => p.id !== currentUser?.id);
              const isActive = selectedDmId === dm.id;
              return (
                <button
                  key={dm.id}
                  onClick={() => {
                    setSelectedDmId(dm.id);
                    setLocation(`/app/dms/${dm.id}`);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={other?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {other?.username?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar",
                      other?.status === "online" ? "bg-green-500" :
                      other?.status === "idle" ? "bg-yellow-500" :
                      other?.status === "dnd" ? "bg-red-500" : "bg-gray-500"
                    )} />
                  </div>
                  <span className="truncate font-medium">{other?.username ?? "Unknown"}</span>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <UserStatusBar />
    </div>
  );
}
