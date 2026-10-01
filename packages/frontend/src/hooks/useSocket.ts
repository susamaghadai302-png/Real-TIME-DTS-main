import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket';
import { useAuthStore } from '../stores/authStore';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
}

export function useSocket(): UseSocketReturn {
  const { token, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socketService.disconnect();
      setIsConnected(false);
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    const socket = socketService.connect(token);
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    const onConnectError = () => {
      setIsConnected(false);
      setConnectionStatus('reconnecting');
    };

    const onReconnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    };

    const onReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect', onReconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);

    if (socket.connected) {
      setIsConnected(true);
      setConnectionStatus('connected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect', onReconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
    };
  }, [isAuthenticated, token]);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      // Only disconnect when the app fully unmounts (not per hook unmount)
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
  };
}
