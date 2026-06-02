import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useCreateServer } from "@workspace/api-client-react";
import { useStore } from "@/store/useStore";
import { useQueryClient } from "@tanstack/react-query";
import { getListMyServersQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Gamepad2,
  GraduationCap,
  Users,
  Palette,
  Code,
  Loader2,
  ImageIcon,
  X,
  ChevronRight,
} from "lucide-react";

const TEMPLATES = [
  {
    id: "blank",
    label: "Create My Own",
    description: "Start from scratch with your own server.",
    icon: Plus,
    color: "text-white",
    bg: "bg-gradient-to-br from-[#5865F2] to-[#4752C4]",
    prefilledName: "My Server",
  },
  {
    id: "gaming",
    label: "Gaming",
    description: "For gamers, streamers, and communities.",
    icon: Gamepad2,
    color: "text-white",
    bg: "bg-gradient-to-br from-[#EB459E] to-[#C13584]",
    prefilledName: "Gaming Server",
  },
  {
    id: "school",
    label: "School Club",
    description: "For study groups, classes, and clubs.",
    icon: GraduationCap,
    color: "text-white",
    bg: "bg-gradient-to-br from-[#3BA55C] to-[#2E8B4C]",
    prefilledName: "Study Group",
  },
  {
    id: "friends",
    label: "Friends",
    description: "For your close friends to hang out.",
    icon: Users,
    color: "text-white",
    bg: "bg-gradient-to-br from-[#FAA61A] to-[#D48A0A]",
    prefilledName: "Friends Hangout",
  },
  {
    id: "art",
    label: "Art",
    description: "For artists, designers, and creatives.",
    icon: Palette,
    color: "text-white",
    bg: "bg-gradient-to-br from-[#ED4245] to-[#C03538]",
    prefilledName: "Art Club",
  },
  {
    id: "roblox",
    label: "Roblox Scripts",
    description: "For Roblox developers and scripters.",
    icon: Code,
    color: "text-white",
    bg: "bg-gradient-to-br from-[#00A8FC] to-[#0087C9]",
    prefilledName: "Roblox Scripts",
  },
];

const fadeSlide = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

export default function CreateServerPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const setSelectedServerId = useStore((s) => s.setSelectedServerId);
  const currentUser = useStore((s) => s.currentUser);

  const [step, setStep] = useState<"template" | "setup" | "creating">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
  const [serverName, setServerName] = useState("");
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createServer = useCreateServer();

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setServerName(template.prefilledName);
    }
    setStep("setup");
    setError(null);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setError(null);
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setIconPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, []);

  const handleCreate = () => {
    const trimmed = serverName.trim();
    if (trimmed.length < 2) {
      setError("Server name must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 100) {
      setError("Server name must be at most 100 characters.");
      return;
    }
    setError(null);
    setStep("creating");

    // If we have an icon, convert it to a data URL (simplified)
    const iconUrl = iconPreview || undefined;

    createServer.mutate(
      { data: { name: trimmed, iconUrl, isPublic: false } },
      {
        onSuccess: (server) => {
          setSelectedServerId(server.id);
          // Invalidate server list so sidebar updates
          queryClient.invalidateQueries({ queryKey: getListMyServersQueryKey() });
          setLocation(`/app/servers/${server.id}`);
        },
        onError: (err: any) => {
          setStep("setup");
          setError(err?.response?.data?.error || "Failed to create server. Try again.");
        },
      }
    );
  };

  const template = TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#36393F] p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === "template" && (
            <motion.div
              key="template"
              {...fadeSlide}
              className="bg-[#2F3136] rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-bold text-white mb-1"
                >
                  Create a server
                </motion.h2>
                <p className="text-sm text-[#B9BBBE]">
                  Your server is where you and your friends hang out.
                  <br />
                  Make yours and start talking.
                </p>
              </div>

              <div className="px-6 pb-6 space-y-3">
                {TEMPLATES.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <motion.button
                      key={t.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectTemplate(t.id)}
                      className="w-full flex items-center gap-4 p-3 rounded-lg bg-[#36393F] hover:bg-[#40444B] transition-colors text-left group"
                    >
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", t.bg)}>
                        <Icon className={cn("w-6 h-6", t.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{t.label}</p>
                        <p className="text-xs text-[#B9BBBE] truncate">{t.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#B9BBBE] group-hover:text-white transition-colors shrink-0" />
                    </motion.button>
                  );
                })}

                <div className="pt-3 border-t border-[#40444B]">
                  <p className="text-xs font-semibold text-[#B9BBBE] uppercase tracking-wider mb-2">
                    Already have an invite?
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      /* Invite join flow - would navigate to invite join */
                      setLocation("/app/friends");
                    }}
                    className="w-full flex items-center gap-4 p-3 rounded-lg bg-[#36393F] hover:bg-[#40444B] transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#2F3136]">
                      <Plus className="w-6 h-6 text-[#B9BBBE]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">Join a Server</p>
                      <p className="text-xs text-[#B9BBBE]">Enter an invite code to join an existing server.</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#B9BBBE] shrink-0" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "setup" && template && (
            <motion.div
              key="setup"
              {...fadeSlide}
              className="bg-[#2F3136] rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <button
                  onClick={() => {
                    setStep("template");
                    setError(null);
                    setIconPreview(null);
                    setIconFile(null);
                  }}
                  className="flex items-center gap-1 text-[#B9BBBE] hover:text-white text-xs mb-4 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-white mb-1 text-center">
                  Customize your server
                </h2>
                <p className="text-sm text-[#B9BBBE] text-center mb-6">
                  Give your new server a personality with a name and an icon.
                  You can always change it later.
                </p>

                {/* Icon upload */}
                <div className="flex justify-center mb-5">
                  <div
                    className={cn(
                      "relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200",
                      dragActive
                        ? "ring-2 ring-[#5865F2] ring-offset-2 ring-offset-[#2F3136]"
                        : "",
                      iconPreview
                        ? "overflow-hidden"
                        : "bg-[#36393F] border-2 border-dashed border-[#72767D] hover:border-[#B9BBBE]"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {iconPreview ? (
                      <>
                        <img
                          src={iconPreview}
                          alt="Server icon"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIconPreview(null);
                            setIconFile(null);
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-[#ED4245] rounded-full flex items-center justify-center text-white hover:bg-[#C03538]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-[#72767D]" />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
                <p className="text-center text-xs text-[#B9BBBE] mb-5">
                  Upload an icon (optional)
                </p>

                {/* Server name */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[#B9BBBE] uppercase mb-1.5">
                    Server Name
                  </label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="Enter server name"
                    className="w-full bg-[#202225] text-white rounded-md px-3 py-2.5 text-sm outline-none border border-[#040405] focus:border-[#5865F2] placeholder:text-[#72767D] transition-colors"
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-[#72767D]">
                      By creating a server, you agree to DisClone&apos;s{" "}
                      <a className="text-[#00A8FC] hover:underline">Community Guidelines</a>.
                    </p>
                    <span className={cn(
                      "text-[11px]",
                      serverName.length > 100 ? "text-[#ED4245]" : "text-[#72767D]"
                    )}>
                      {serverName.length}/100
                    </span>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 rounded-md bg-[#ED4245]/10 border border-[#ED4245]/30 px-3 py-2"
                    >
                      <p className="text-xs text-[#ED4245]">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setStep("template");
                      setError(null);
                      setIconPreview(null);
                      setIconFile(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-white bg-[#4F545C] hover:bg-[#5D636B] transition-colors"
                  >
                    Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreate}
                    disabled={!serverName.trim() || serverName.trim().length < 2 || createServer.isPending}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors",
                      !serverName.trim() || serverName.trim().length < 2 || createServer.isPending
                        ? "bg-[#5865F2]/50 cursor-not-allowed"
                        : "bg-[#5865F2] hover:bg-[#4752C4]"
                    )}
                  >
                    {createServer.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      "Create"
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "creating" && (
            <motion.div
              key="creating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#2F3136] rounded-lg shadow-2xl p-8 flex flex-col items-center"
            >
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-[#5865F2]/30" />
                <div className="absolute inset-0 rounded-full border-4 border-[#5865F2] border-t-transparent animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Creating your server...</h3>
              <p className="text-sm text-[#B9BBBE]">This won&apos;t take long.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
