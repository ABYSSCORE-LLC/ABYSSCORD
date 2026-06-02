import { create } from 'zustand';
import { User } from '@workspace/api-client-react';

interface AppState {
  currentUser: User | null;
  token: string | null;
  selectedServerId: number | null;
  selectedChannelId: number | null;
  selectedDmId: number | null;
  socketConnected: boolean;
  typingUsers: Record<number, string[]>;
  onlineUsers: Set<number>;

  setCurrentUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setSelectedServerId: (id: number | null) => void;
  setSelectedChannelId: (id: number | null) => void;
  setSelectedDmId: (id: number | null) => void;
  setSocketConnected: (connected: boolean) => void;
  addTypingUser: (channelId: number, username: string) => void;
  removeTypingUser: (channelId: number, username: string) => void;
  setOnlineUsers: (users: number[]) => void;
  addOnlineUser: (userId: number) => void;
  removeOnlineUser: (userId: number) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  token: localStorage.getItem('disclone_token'),
  selectedServerId: null,
  selectedChannelId: null,
  selectedDmId: null,
  socketConnected: false,
  typingUsers: {},
  onlineUsers: new Set(),

  setCurrentUser: (user) => set({ currentUser: user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('disclone_token', token);
    } else {
      localStorage.removeItem('disclone_token');
    }
    set({ token });
  },
  setSelectedServerId: (id) => set({ selectedServerId: id, selectedDmId: null }),
  setSelectedChannelId: (id) => set({ selectedChannelId: id }),
  setSelectedDmId: (id) => set({ selectedDmId: id, selectedServerId: null, selectedChannelId: null }),
  setSocketConnected: (connected) => set({ socketConnected: connected }),
  addTypingUser: (channelId, username) => set((state) => {
    const current = state.typingUsers[channelId] || [];
    if (current.includes(username)) return state;
    return { typingUsers: { ...state.typingUsers, [channelId]: [...current, username] } };
  }),
  removeTypingUser: (channelId, username) => set((state) => {
    const current = state.typingUsers[channelId] || [];
    return { typingUsers: { ...state.typingUsers, [channelId]: current.filter((u) => u !== username) } };
  }),
  setOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),
  addOnlineUser: (userId) => set((state) => {
    const next = new Set(state.onlineUsers);
    next.add(userId);
    return { onlineUsers: next };
  }),
  removeOnlineUser: (userId) => set((state) => {
    const next = new Set(state.onlineUsers);
    next.delete(userId);
    return { onlineUsers: next };
  }),
  logout: () => {
    localStorage.removeItem('disclone_token');
    set({
      currentUser: null,
      token: null,
      selectedServerId: null,
      selectedChannelId: null,
      selectedDmId: null,
      typingUsers: {},
      onlineUsers: new Set(),
    });
  },
}));
