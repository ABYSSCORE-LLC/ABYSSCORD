import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, Headphones, Settings } from "lucide-react";
import SettingsModal from "@/components/dialogs/settings-modal";

export default function UserStatusBar() {
  const currentUser = useStore((s) => s.currentUser);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <>
      <div className="flex items-center justify-between px-2 py-2 bg-sidebar-accent/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                {currentUser.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar bg-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{currentUser.username}</p>
            <p className="text-xs text-muted-foreground truncate">
              #{currentUser.discriminator}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Headphones className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="User Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
