import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { QueryClient } from '@tanstack/react-query';
import { getListMessagesQueryKey, getListDMMessagesQueryKey } from '@workspace/api-client-react';

let socket: Socket | null = null;

export function initSocket(token: string, queryClient: QueryClient) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(window.location.origin, {
    path: "/api/socket.io",
    auth: { token },
  });

  socket.on('connect', () => {
    useStore.getState().setSocketConnected(true);
  });

  socket.on('disconnect', () => {
    useStore.getState().setSocketConnected(false);
  });

  socket.on('message:new', (data: { channelId: number, message: any }) => {
    // Invalidate the specific channel's messages
    queryClient.invalidateQueries({
      queryKey: getListMessagesQueryKey(data.channelId)
    });
    // Invalidate DMs as well just in case
    queryClient.invalidateQueries({
      queryKey: getListDMMessagesQueryKey(data.channelId)
    });
  });

  socket.on('message:update', (data: { channelId: number, message: any }) => {
    queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(data.channelId) });
    queryClient.invalidateQueries({ queryKey: getListDMMessagesQueryKey(data.channelId) });
  });

  socket.on('message:delete', (data: { channelId: number, messageId: number }) => {
    queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(data.channelId) });
    queryClient.invalidateQueries({ queryKey: getListDMMessagesQueryKey(data.channelId) });
  });

  socket.on('typing:start', (data: { channelId: number, username: string }) => {
    useStore.getState().addTypingUser(data.channelId, data.username);
  });

  socket.on('typing:stop', (data: { channelId: number, username: string }) => {
    useStore.getState().removeTypingUser(data.channelId, data.username);
  });

  socket.on('presence:update', (data: { onlineUsers: number[] }) => {
    useStore.getState().setOnlineUsers(data.onlineUsers);
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  useStore.getState().setSocketConnected(false);
}

export function getSocket() {
  return socket;
}
