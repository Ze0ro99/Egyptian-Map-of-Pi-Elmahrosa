import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useVirtualizer } from 'react-virtual'; // v3.0.0
import imageCompression from 'browser-image-compression'; // v2.0.0
import { useNetworkQuality } from '@network/quality-hooks'; // v1.0.0
import { Box, Typography, TextField, IconButton, Paper, CircularProgress } from '@mui/material';
import { Send as SendIcon, Image as ImageIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import {
  IMessage,
  IConversation,
  MessageType,
  MessageStatus,
} from '../../interfaces/message.interface';

// Enhanced props interface with network quality and presence
interface ConversationPageProps {
  conversationId: string;
  networkQuality: 'high' | 'medium' | 'low' | 'offline';
  presenceStatus: 'online' | 'away' | 'offline';
  isOffline: boolean;
}

// Message queue type for offline support
interface QueuedMessage {
  content: string;
  type: MessageType;
  retryCount: number;
  timestamp: Date;
}

const ConversationPage: React.FC<ConversationPageProps> = ({
  conversationId,
  networkQuality,
  presenceStatus,
  isOffline,
}) => {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('messages');
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<QueuedMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const socketRef = useRef<WebSocket | null>(null);

  // Network quality monitoring
  const { quality, latency } = useNetworkQuality({
    pingInterval: 5000,
    threshold: {
      high: 150,
      medium: 300,
      low: 500,
    },
  });

  // Virtual scrolling implementation for performance
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 80, []),
    overscan: 5,
  });

  // Initialize WebSocket connection with reconnection logic
  useEffect(() => {
    const initializeWebSocket = () => {
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL as string);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'join',
          conversationId,
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onclose = () => {
        setTimeout(initializeWebSocket, 3000);
      };

      socketRef.current = ws;
    };

    initializeWebSocket();
    return () => socketRef.current?.close();
  }, [conversationId]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'message':
        setMessages(prev => [...prev, data.message]);
        break;
      case 'typing':
        setIsTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        break;
      case 'presence':
        // Handle presence updates
        break;
    }
  }, []);

  // Image compression for Egyptian mobile networks
  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Image compression failed:', error);
      return file;
    }
  };

  // Handle message sending with offline support
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage,
      type: MessageType.TEXT,
      timestamp: new Date(),
    };

    if (isOffline) {
      setOfflineQueue(prev => [...prev, { ...messageData, retryCount: 0 }]);
    } else {
      try {
        socketRef.current?.send(JSON.stringify({
          type: 'message',
          data: messageData,
        }));
        setNewMessage('');
      } catch (error) {
        setOfflineQueue(prev => [...prev, { ...messageData, retryCount: 0 }]);
      }
    }
  };

  // Process offline message queue when connection restores
  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      const processQueue = async () => {
        for (const message of offlineQueue) {
          try {
            await socketRef.current?.send(JSON.stringify({
              type: 'message',
              data: message,
            }));
          } catch (error) {
            if (message.retryCount < 3) {
              setOfflineQueue(prev => [
                ...prev,
                { ...message, retryCount: message.retryCount + 1 },
              ]);
            }
          }
        }
        setOfflineQueue([]);
      };

      processQueue();
    }
  }, [isOffline, offlineQueue]);

  return (
    <Box sx={styles.container}>
      {/* Network quality indicator */}
      <Box sx={styles.networkIndicator}>
        <Typography variant="caption" color={quality === 'low' ? 'error' : 'textSecondary'}>
          {t(`network.${quality}`)} ({latency}ms)
        </Typography>
      </Box>

      {/* Offline indicator */}
      {isOffline && (
        <Paper sx={styles.offlineIndicator}>
          <Typography>
            {t('offline.message')} ({offlineQueue.length} {t('offline.pending')})
          </Typography>
        </Paper>
      )}

      {/* Messages container with virtual scrolling */}
      <Box ref={parentRef} sx={styles.messagesContainer}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageBubble message={messages[virtualRow.index]} />
            </div>
          ))}
        </div>
      </Box>

      {/* Typing indicator */}
      {isTyping && (
        <Box sx={styles.typingIndicator}>
          <Typography variant="caption">
            {t('typing')}
          </Typography>
        </Box>
      )}

      {/* Message input */}
      <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('input.placeholder')}
          InputProps={{
            endAdornment: (
              <>
                <IconButton component="label">
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const compressed = await compressImage(e.target.files[0]);
                        // Handle image upload
                      }
                    }}
                  />
                  <ImageIcon />
                </IconButton>
                <IconButton onClick={handleSendMessage} disabled={isOffline || !newMessage.trim()}>
                  <SendIcon />
                </IconButton>
              </>
            ),
          }}
        />
      </Box>
    </Box>
  );
};

// Styles object
const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column-reverse',
  },
  networkIndicator: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 1000,
  },
  offlineIndicator: {
    backgroundColor: 'warning.main',
    color: 'warning.contrastText',
    padding: '8px',
    textAlign: 'center',
  },
  typingIndicator: {
    padding: '8px',
    fontStyle: 'italic',
    color: 'text.secondary',
  },
};

// Server-side props for i18n
export const getServerSideProps = async ({ locale }: { locale: string }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['messages', 'common'])),
    },
  };
};

export default ConversationPage;