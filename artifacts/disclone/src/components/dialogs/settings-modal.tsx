import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Shield, Star, Users, Image, Lock, Bell, CreditCard,
  Mic, Monitor, Accessibility, Keyboard, Globe, Activity,
  Code, LogOut, ChevronRight, Check, Eye, EyeOff, Camera,
  Smartphone, Laptop, Edit2, Plus
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type TabId =
  | "account" | "password-security" | "standing" | "family"
  | "content-social" | "privacy" | "authorized-apps" | "connections"
  | "notifications" | "billing" | "voice-video" | "appearance"
  | "accessibility" | "keybinds" | "language" | "activity-privacy"
  | "developer";

interface NavItem {
  id: TabId;
  label: string;
  badge?: string;
  danger?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "User Settings",
    items: [
      { id: "account", label: "Account" },
      { id: "password-security", label: "Password & Security" },
      { id: "standing", label: "Account Standing" },
      { id: "family", label: "Family Center" },
      { id: "content-social", label: "Content & Social" },
      { id: "privacy", label: "Data & Privacy" },
      { id: "authorized-apps", label: "Authorized Apps" },
      { id: "connections", label: "Connections" },
      { id: "notifications", label: "Notifications" },
    ],
  },
  {
    title: "Billing Settings",
    items: [
      { id: "billing", label: "Nitro & Billing" },
    ],
  },
  {
    title: "App Settings",
    items: [
      { id: "voice-video", label: "Voice & Video" },
      { id: "appearance", label: "Appearance", badge: "NEW" },
      { id: "accessibility", label: "Accessibility" },
      { id: "keybinds", label: "Keybinds" },
      { id: "language", label: "Language & Time" },
    ],
  },
  {
    title: "Activity Settings",
    items: [
      { id: "activity-privacy", label: "Activity Privacy" },
    ],
  },
  {
    title: "Developer",
    items: [
      { id: "developer", label: "Developer" },
    ],
  },
];

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const masked = user.slice(0, 2) + "*".repeat(Math.max(user.length - 2, 3));
  return `${masked}@${domain}`;
}

function InlineEditForm({
  label,
  value,
  onSave,
  onCancel,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  type?: string;
  placeholder?: string;
}) {
  const [val, setVal] = useState(value);
  return (
    <div className="mt-3 bg-[#1e1f22] rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-1">
          {label}
        </label>
        <input
          type={type}
          className="w-full bg-[#1a1b1e] text-white rounded px-3 py-2 text-sm border border-[#3f4147] focus:border-[#5865f2] outline-none transition-colors"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(val)}
          className="px-4 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-sm font-medium transition-colors"
        >
          Done
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-[#b5bac1] hover:text-white rounded text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PasswordChangeForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const token = useStore((s) => s.token);

  async function handleSave() {
    if (next !== confirm) { setError("New passwords do not match"); return; }
    if (next.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to change password"); return; }
      toast({ description: "Password changed successfully!" });
      onDone();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 bg-[#1e1f22] rounded-lg p-4 space-y-3">
      {[
        { label: "Current Password", val: current, setter: setCurrent, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
        { label: "New Password", val: next, setter: setNext, show: showNext, toggle: () => setShowNext(!showNext) },
        { label: "Confirm New Password", val: confirm, setter: setConfirm, show: showNext, toggle: () => setShowNext(!showNext) },
      ].map(({ label, val, setter, show, toggle }) => (
        <div key={label}>
          <label className="block text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-1">{label}</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              className="w-full bg-[#1a1b1e] text-white rounded px-3 py-2 pr-10 text-sm border border-[#3f4147] focus:border-[#5865f2] outline-none transition-colors"
              value={val}
              onChange={(e) => setter(e.target.value)}
              autoFocus={label === "Current Password"}
            />
            <button
              type="button"
              onClick={toggle}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b5bac1] hover:text-white"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ))}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
        >
          {loading ? "Saving…" : "Done"}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-[#b5bac1] hover:text-white rounded text-sm font-medium transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function AccountTab() {
  const currentUser = useStore((s) => s.currentUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateMe = useUpdateMe();

  const [editField, setEditField] = useState<"username" | "email" | "displayName" | "bio" | "password" | null>(null);
  const [emailRevealed, setEmailRevealed] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  async function handleSaveField(field: "username" | "email" | "displayName" | "bio", value: string) {
    try {
      const updated = await updateMe.mutateAsync({ data: { [field]: value } });
      setCurrentUser(updated);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ description: "Changes saved!" });
      setEditField(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast({ variant: "destructive", description: msg });
    }
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ variant: "destructive", description: "Please select an image file" }); return; }
    if (file.size > 8 * 1024 * 1024) { toast({ variant: "destructive", description: "Image must be under 8MB" }); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
      try {
        const updated = await updateMe.mutateAsync({ data: { avatarUrl: dataUrl } });
        setCurrentUser(updated);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ description: "Avatar updated!" });
      } catch {
        toast({ variant: "destructive", description: "Failed to update avatar" });
        setAvatarPreview(null);
      }
    };
    reader.readAsDataURL(file);
  }

  const displayAvatar = avatarPreview || currentUser.avatarUrl || undefined;

  return (
    <div className="space-y-6">
      {/* Profile banner + avatar */}
      <div className="relative rounded-lg overflow-hidden" style={{ background: currentUser.accentColor || "#5865f2" }}>
        <div className="h-24" style={{ background: `linear-gradient(135deg, ${currentUser.accentColor || "#5865f2"}, ${currentUser.accentColor ? currentUser.accentColor + "88" : "#7289da88"})` }} />
        <div className="px-4 pb-4 flex items-end gap-4 -mt-10">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="w-20 h-20 border-4 border-[#313338]">
              <AvatarImage src={displayAvatar} />
              <AvatarFallback className="bg-primary text-white text-2xl font-bold">
                {currentUser.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          </div>
          <div className="mb-1">
            <p className="text-white font-bold text-lg leading-tight">{currentUser.displayName || currentUser.username}</p>
            <p className="text-white/70 text-sm">#{currentUser.discriminator}</p>
          </div>
          <button className="ml-auto mb-1 px-3 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold rounded transition-colors">
            Edit Profiles
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-[#1e1f22] rounded-lg p-4 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Account Info</h3>

        {/* Username */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#b5bac1] font-semibold uppercase tracking-wide mb-0.5">Username</p>
              <p className="text-white text-sm">{currentUser.username}<span className="text-[#b5bac1]">#{currentUser.discriminator}</span></p>
            </div>
            <button
              onClick={() => setEditField(editField === "username" ? null : "username")}
              className="px-3 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold rounded transition-colors"
            >
              Edit
            </button>
          </div>
          {editField === "username" && (
            <InlineEditForm
              label="Username"
              value={currentUser.username}
              placeholder="Enter new username"
              onSave={(v) => handleSaveField("username", v)}
              onCancel={() => setEditField(null)}
            />
          )}
        </div>

        <div className="border-t border-[#3f4147]" />

        {/* Display Name */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#b5bac1] font-semibold uppercase tracking-wide mb-0.5">Display Name</p>
              <p className="text-white text-sm">{currentUser.displayName || <span className="text-[#b5bac1] italic">Not set</span>}</p>
            </div>
            <button
              onClick={() => setEditField(editField === "displayName" ? null : "displayName")}
              className="px-3 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold rounded transition-colors"
            >
              Edit
            </button>
          </div>
          {editField === "displayName" && (
            <InlineEditForm
              label="Display Name"
              value={currentUser.displayName || ""}
              placeholder="Enter display name"
              onSave={(v) => handleSaveField("displayName", v)}
              onCancel={() => setEditField(null)}
            />
          )}
        </div>

        <div className="border-t border-[#3f4147]" />

        {/* Email */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#b5bac1] font-semibold uppercase tracking-wide mb-0.5">Email</p>
              <div className="flex items-center gap-2">
                <p className="text-white text-sm">
                  {emailRevealed ? (currentUser.email ?? "") : maskEmail(currentUser.email ?? "")}
                </p>
                <button
                  onClick={() => setEmailRevealed(!emailRevealed)}
                  className="text-[#00a8fc] hover:underline text-xs font-medium"
                >
                  {emailRevealed ? "Hide" : "Reveal"}
                </button>
              </div>
            </div>
            <button
              onClick={() => setEditField(editField === "email" ? null : "email")}
              className="px-3 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold rounded transition-colors"
            >
              Edit
            </button>
          </div>
          {editField === "email" && (
            <InlineEditForm
              label="Email Address"
              value={currentUser.email ?? ""}
              type="email"
              placeholder="Enter new email"
              onSave={(v) => handleSaveField("email", v)}
              onCancel={() => setEditField(null)}
            />
          )}
        </div>

        <div className="border-t border-[#3f4147]" />

        {/* Phone */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#b5bac1] font-semibold uppercase tracking-wide mb-0.5">Phone Number</p>
            <p className="text-[#b5bac1] text-sm italic">Not added</p>
          </div>
          <button className="px-3 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold rounded transition-colors flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* Password & Security */}
      <div className="bg-[#1e1f22] rounded-lg p-4 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Password & Security</h3>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Password</p>
              <p className="text-xs text-[#b5bac1]">Change your login password</p>
            </div>
            <button
              onClick={() => setEditField(editField === "password" ? null : "password")}
              className="px-3 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold rounded transition-colors"
            >
              Change Password
            </button>
          </div>
          {editField === "password" && (
            <PasswordChangeForm onDone={() => setEditField(null)} onCancel={() => setEditField(null)} />
          )}
        </div>

        <div className="border-t border-[#3f4147]" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Multi-Factor Authentication</p>
            <p className="text-xs text-[#b5bac1]">Protect your account with 2FA</p>
          </div>
          <button className="px-3 py-1 bg-[#23a559] hover:bg-[#1a7d40] text-white text-xs font-semibold rounded transition-colors">
            Set Up
          </button>
        </div>

        <div className="border-t border-[#3f4147]" />

        {/* Logged-in devices */}
        <div>
          <p className="text-sm font-semibold text-white mb-3">Logged-in Devices</p>
          {[
            { icon: <Laptop className="w-5 h-5" />, name: "Chrome on Windows", location: "New York, US", active: true },
            { icon: <Smartphone className="w-5 h-5" />, name: "DisClone iOS App", location: "New York, US", active: false },
            { icon: <Monitor className="w-5 h-5" />, name: "Firefox on macOS", location: "San Francisco, US", active: false },
          ].map((device) => (
            <div key={device.name} className="flex items-center gap-3 py-2">
              <div className="text-[#b5bac1]">{device.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-medium">{device.name}</p>
                  {device.active && <span className="text-xs bg-[#23a559]/20 text-[#23a559] px-1.5 py-0.5 rounded font-semibold">Active Now</span>}
                </div>
                <p className="text-xs text-[#b5bac1]">{device.location}</p>
              </div>
              {!device.active && (
                <button className="text-xs text-[#ed4245] hover:text-[#f25b5e] font-medium transition-colors">
                  Log Out
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Account Removal */}
      <div className="bg-[#1e1f22] rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Account Removal</h3>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-transparent border border-[#ed4245] text-[#ed4245] hover:bg-[#ed4245]/10 rounded text-sm font-semibold transition-colors">
            Disable Account
          </button>
          <button className="px-4 py-2 bg-[#ed4245] hover:bg-[#c03537] text-white rounded text-sm font-semibold transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTab({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-4 opacity-60">
      <div className="text-[#b5bac1] scale-150">{icon}</div>
      <div>
        <p className="text-white font-semibold text-lg">{title}</p>
        <p className="text-[#b5bac1] text-sm mt-1">This section is coming soon.</p>
      </div>
    </div>
  );
}

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  account: <User className="w-4 h-4" />,
  "password-security": <Lock className="w-4 h-4" />,
  standing: <Star className="w-4 h-4" />,
  family: <Users className="w-4 h-4" />,
  "content-social": <Image className="w-4 h-4" />,
  privacy: <Shield className="w-4 h-4" />,
  "authorized-apps": <Code className="w-4 h-4" />,
  connections: <ChevronRight className="w-4 h-4" />,
  notifications: <Bell className="w-4 h-4" />,
  billing: <CreditCard className="w-4 h-4" />,
  "voice-video": <Mic className="w-4 h-4" />,
  appearance: <Monitor className="w-4 h-4" />,
  accessibility: <Accessibility className="w-4 h-4" />,
  keybinds: <Keyboard className="w-4 h-4" />,
  language: <Globe className="w-4 h-4" />,
  "activity-privacy": <Activity className="w-4 h-4" />,
  developer: <Code className="w-4 h-4" />,
};

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [searchQuery, setSearchQuery] = useState("");
  const logout = useStore((s) => s.logout);
  const currentUser = useStore((s) => s.currentUser);
  const { toast } = useToast();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleLogout() {
    logout();
    onClose();
    toast({ description: "You have been logged out." });
  }

  const filteredSections = searchQuery.trim()
    ? NAV_SECTIONS.map((sec) => ({
        ...sec,
        items: sec.items.filter((item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((sec) => sec.items.length > 0)
    : NAV_SECTIONS;

  function renderContent() {
    switch (activeTab) {
      case "account": return <AccountTab />;
      case "password-security": return <PlaceholderTab title="Password & Security" icon={<Lock className="w-8 h-8" />} />;
      case "standing": return <PlaceholderTab title="Account Standing" icon={<Star className="w-8 h-8" />} />;
      case "family": return <PlaceholderTab title="Family Center" icon={<Users className="w-8 h-8" />} />;
      case "content-social": return <PlaceholderTab title="Content & Social" icon={<Image className="w-8 h-8" />} />;
      case "privacy": return <PlaceholderTab title="Data & Privacy" icon={<Shield className="w-8 h-8" />} />;
      case "authorized-apps": return <PlaceholderTab title="Authorized Apps" icon={<Code className="w-8 h-8" />} />;
      case "connections": return <PlaceholderTab title="Connections" icon={<ChevronRight className="w-8 h-8" />} />;
      case "notifications": return <PlaceholderTab title="Notifications" icon={<Bell className="w-8 h-8" />} />;
      case "billing": return <PlaceholderTab title="Nitro & Billing" icon={<CreditCard className="w-8 h-8" />} />;
      case "voice-video": return <PlaceholderTab title="Voice & Video" icon={<Mic className="w-8 h-8" />} />;
      case "appearance": return <PlaceholderTab title="Appearance" icon={<Monitor className="w-8 h-8" />} />;
      case "accessibility": return <PlaceholderTab title="Accessibility" icon={<Accessibility className="w-8 h-8" />} />;
      case "keybinds": return <PlaceholderTab title="Keybinds" icon={<Keyboard className="w-8 h-8" />} />;
      case "language": return <PlaceholderTab title="Language & Time" icon={<Globe className="w-8 h-8" />} />;
      case "activity-privacy": return <PlaceholderTab title="Activity Privacy" icon={<Activity className="w-8 h-8" />} />;
      case "developer": return <PlaceholderTab title="Developer" icon={<Code className="w-8 h-8" />} />;
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 flex w-full h-full bg-[#313338]"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {/* Left sidebar */}
            <div className="w-[232px] bg-[#2b2d31] flex-shrink-0 flex flex-col overflow-y-auto">
              <div className="px-4 pt-6 pb-2">
                <input
                  type="text"
                  placeholder="Search settings…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1e1f22] text-sm text-white rounded px-3 py-1.5 placeholder-[#72767d] outline-none border border-transparent focus:border-[#5865f2] transition-colors"
                />
              </div>

              <nav className="flex-1 px-2 py-1">
                {filteredSections.map((section) => (
                  <div key={section.title || "misc"} className="mb-1">
                    {section.title && (
                      <p className="px-2 pt-3 pb-1 text-xs font-bold text-[#b5bac1] uppercase tracking-wider">
                        {section.title}
                      </p>
                    )}
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setSearchQuery(""); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition-colors text-left",
                          activeTab === item.id
                            ? "bg-[#404249] text-white"
                            : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]",
                          item.danger && "text-[#ed4245] hover:text-[#f25b5e]"
                        )}
                      >
                        <span className="opacity-70">{TAB_ICONS[item.id]}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] bg-[#ed4245] text-white px-1.5 py-0.5 rounded font-bold leading-none">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}

                {!searchQuery && (
                  <>
                    <div className="border-t border-[#3f4147] my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium text-[#ed4245] hover:bg-[#ed4245]/10 hover:text-[#f25b5e] transition-colors"
                    >
                      <LogOut className="w-4 h-4 opacity-70" />
                      Log Out
                    </button>
                    <div className="px-2 pb-4 pt-1">
                      <p className="text-xs text-[#72767d]">
                        DisClone v1.0.0
                      </p>
                    </div>
                  </>
                )}
              </nav>

              {/* User mini badge */}
              {currentUser && (
                <div className="px-3 py-3 border-t border-[#3f4147] flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentUser.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary text-white text-xs font-bold">
                      {currentUser.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{currentUser.username}</p>
                    <p className="text-xs text-[#b5bac1] truncate">#{currentUser.discriminator}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-10 py-8 max-w-3xl w-full mx-auto">
                <h1 className="text-xl font-bold text-white mb-6">
                  {NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === activeTab)?.label ?? activeTab}
                </h1>
                {renderContent()}
              </div>
            </div>

            {/* Close button */}
            <div className="absolute top-4 right-4 flex flex-col items-center gap-1">
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#4e5058] hover:bg-[#6d6f78] flex items-center justify-center transition-colors group"
              >
                <X className="w-5 h-5 text-[#dbdee1] group-hover:text-white" />
              </button>
              <span className="text-xs text-[#b5bac1]">ESC</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
