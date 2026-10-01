import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting = false,
}) => {
  if (isConnected) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-200">
      {isConnecting ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Reconnecting to live tracking stream...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Connection lost. Attempting to restore live updates...</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatus;

