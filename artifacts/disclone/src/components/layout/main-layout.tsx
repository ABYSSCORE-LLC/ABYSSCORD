import { useLocation, Route, Switch } from "wouter";
import { useStore } from "@/store/useStore";
import { useListMyServers } from "@workspace/api-client-react";
import { MessageSquare, Plus, Compass } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import DMPanel from "./dm-panel";
import ServerPanel from "./server-panel";

import FriendsPage from "@/pages/friends";
import ChannelPage from "@/pages/channel";
import DMPage from "@/pages/dm";

function DiscoverView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
      <Compass className="w-16 h-16 opacity-20" />
      <p className="font-semibold text-lg">Discover Servers</p>
      <p className="text-sm">Coming soon!</p>
    </div>
  );
}

function EmptyChannel() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <p>Select a channel to start chatting</p>
    </div>
  );
}

function ServerRail() {
  const [location, setLocation] = useLocation();
  const { data: servers = [] } = useListMyServers();
  const selectedServerId = useStore((state) => state.selectedServerId);
  const setSelectedServerId = useStore((state) => state.setSelectedServerId);
  const setSelectedDmId = useStore((state) => state.setSelectedDmId);
  const setSelectedChannelId = useStore((state) => state.setSelectedChannelId);

  const goHome = () => {
    setSelectedServerId(null);
    setSelectedDmId(null);
    setLocation("/app/friends");
  };

  const goDiscover = () => {
    setSelectedServerId(null);
    setSelectedDmId(null);
    setLocation("/app/discover");
  };

  const isDMRoute = !selectedServerId && !location.startsWith("/app/discover");

  return (
    <div className="w-[72px] bg-sidebar flex flex-col items-center py-3 gap-2 overflow-y-auto shrink-0 z-20">
      {/* DMs / Home button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={goHome}
            className={cn(
              "w-12 h-12 flex items-center justify-center transition-all duration-200 group relative",
              isDMRoute
                ? "bg-primary rounded-[16px] text-white"
                : "bg-background text-foreground hover:bg-primary hover:text-white rounded-[24px] hover:rounded-[16px]"
            )}
          >
            {isDMRoute && (
              <div className="absolute left-[-16px] top-[14px] w-[8px] h-[20px] bg-white rounded-r-md" />
            )}
            <MessageSquare className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-semibold text-sm">Direct Messages</TooltipContent>
      </Tooltip>

      <div className="w-8 h-[2px] bg-border rounded-full mx-auto" />

      {/* Servers */}
      {servers.map((server) => {
        const isSelected = selectedServerId === server.id;
        return (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  setSelectedServerId(server.id);
                  setSelectedChannelId(null);
                  setLocation(`/app/servers/${server.id}`);
                }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center font-bold text-lg transition-all duration-200 relative overflow-hidden",
                  isSelected
                    ? "bg-primary text-white rounded-[16px]"
                    : "bg-background text-foreground hover:bg-primary hover:text-white rounded-[24px] hover:rounded-[16px]"
                )}
              >
                {isSelected && (
                  <div className="absolute left-[-16px] top-[4px] w-[8px] h-[40px] bg-white rounded-r-md" />
                )}
                {!isSelected && (
                  <div className="absolute left-[-16px] top-[16px] w-[8px] h-[8px] bg-white rounded-r-md opacity-0 group-hover:opacity-100 transition-all" />
                )}
                {server.iconUrl ? (
                  <img src={server.iconUrl} alt={server.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">{server.name.substring(0, 2).toUpperCase()}</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold text-sm">{server.name}</TooltipContent>
          </Tooltip>
        );
      })}

      {/* Add server */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setLocation("/app/servers/new")}
            className="w-12 h-12 flex items-center justify-center text-green-500 bg-background hover:bg-green-500 hover:text-white rounded-[24px] hover:rounded-[16px] transition-all duration-200"
          >
            <Plus className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-semibold text-sm">Add a Server</TooltipContent>
      </Tooltip>

      {/* Discover */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={goDiscover}
            className={cn(
              "w-12 h-12 flex items-center justify-center transition-all duration-200",
              location.startsWith("/app/discover")
                ? "bg-green-500 text-white rounded-[16px]"
                : "text-green-500 bg-background hover:bg-green-500 hover:text-white rounded-[24px] hover:rounded-[16px]"
            )}
          >
            <Compass className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-semibold text-sm">Explore Discoverable Servers</TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function MainLayout() {
  const token = useStore((state) => state.token);
  const selectedServerId = useStore((state) => state.selectedServerId);

  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ServerRail />

        {/* Second panel: DM list or Server channel list */}
        {selectedServerId ? (
          /* Server panel (channel list + members list) */
          <Switch>
            <Route path="/app/servers/:serverId/channels/:channelId">
              <div className="flex flex-1 min-w-0">
                <ServerPanel serverId={selectedServerId} />
                <ChannelPage />
              </div>
            </Route>
            <Route path="/app/servers/:serverId">
              <div className="flex flex-1 min-w-0">
                <ServerPanel serverId={selectedServerId} />
                <EmptyChannel />
              </div>
            </Route>
            <Route>
              <div className="flex flex-1 min-w-0">
                <ServerPanel serverId={selectedServerId} />
                <EmptyChannel />
              </div>
            </Route>
          </Switch>
        ) : (
          /* DM / Friends panel */
          <>
            <DMPanel />
            <div className="flex flex-1 min-w-0">
              <Switch>
                <Route path="/app/friends" component={FriendsPage} />
                <Route path="/app/discover" component={DiscoverView} />
                <Route path="/app/dms/:dmId" component={DMPage} />
                <Route>
                  <FriendsPage />
                </Route>
              </Switch>
            </div>
          </>
        )}
    </div>
  );
}
