import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateServer } from "@workspace/api-client-react";
import { useStore } from "@/store/useStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface CreateServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateServerDialog({ open, onOpenChange }: CreateServerDialogProps) {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const setSelectedServerId = useStore((s) => s.setSelectedServerId);
  const createServer = useCreateServer();

  const handleCreate = () => {
    if (!name.trim()) return;
    createServer.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: (server) => {
          setSelectedServerId(server.id);
          setLocation(`/app/servers/${server.id}`);
          onOpenChange(false);
          setName("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Create your server</DialogTitle>
          <p className="text-center text-sm text-muted-foreground mt-1">
            Give your new server a personality with a name and an icon. You can always change it later.
          </p>
        </DialogHeader>

        {/* Icon placeholder */}
        <div className="flex justify-center my-2">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors">
            <span className="text-xs text-center px-1">Upload Icon</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Server Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={`${Math.random() > 0.5 ? "Awesome" : "Epic"}'s server`}
              className="mt-1.5 bg-background border-border"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={!name.trim() || createServer.isPending}
            >
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
