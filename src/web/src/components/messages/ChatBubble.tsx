/**
 * @fileoverview Enhanced chat bubble component for Egyptian Map of Pi marketplace
 * Implements accessible, RTL-aware message display with delivery status indicators
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import { Box, Typography, Paper, Skeleton } from '@mui/material'; // v5.14+
import { Done, DoneAll, ErrorOutline } from '@mui/icons-material'; // v5.14+
import { IMessage, MessageType, MessageStatus } from '../../interfaces/message.interface';
import { formatMessageTime } from '../../utils/date.util';

/**
 * Props interface for ChatBubble component with enhanced accessibility
 */
interface ChatBubbleProps {
  /** Message data object */
  message: IMessage;
  /** Flag indicating if message is from current user */
  isOwn: boolean;
  /** Current interface language (ar/en) */
  language: string;
  /** Callback for message retry on error */
  onRetry?: (messageId: string) => void;
  /** Callback for image load completion */
  onImageLoad?: (messageId: string) => void;
}

/**
 * Enhanced chat bubble component with accessibility and RTL support
 */
const ChatBubble: React.FC<ChatBubbleProps> = React.memo(({
  message,
  isOwn,
  language,
  onRetry,
  onImageLoad
}) => {
  // Determine text direction based on language
  const isRTL = language === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';

  // Message status indicator component
  const StatusIndicator = React.useMemo(() => {
    switch (message.status) {
      case MessageStatus.SENT:
        return <Done fontSize="small" sx={{ color: 'text.secondary' }} />;
      case MessageStatus.DELIVERED:
        return <DoneAll fontSize="small" sx={{ color: 'text.secondary' }} />;
      case MessageStatus.READ:
        return <DoneAll fontSize="small" sx={{ color: 'primary.main' }} />;
      default:
        return null;
    }
  }, [message.status]);

  // Image loading state handler
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Handle image load completion
  const handleImageLoad = React.useCallback(() => {
    setImageLoaded(true);
    onImageLoad?.(message.id);
  }, [message.id, onImageLoad]);

  // Handle retry on error
  const handleRetry = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRetry?.(message.id);
  }, [message.id, onRetry]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
        maxWidth: '70%',
        minWidth: '44px',
        minHeight: '44px'
      }}
      dir={direction}
    >
      <Paper
        elevation={1}
        sx={{
          padding: '8px 12px',
          backgroundColor: isOwn ? 'primary.main' : 'background.paper',
          color: isOwn ? 'primary.contrastText' : 'text.primary',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          wordBreak: 'break-word'
        }}
        role="article"
        aria-label={`Message ${isOwn ? 'sent' : 'received'}`}
      >
        {message.type === MessageType.TEXT && (
          <Typography
            variant="body1"
            component="p"
            sx={{ direction }}
            lang={language}
          >
            {message.content}
          </Typography>
        )}

        {message.type === MessageType.IMAGE && (
          <Box
            sx={{
              maxWidth: '100%',
              position: 'relative',
              aspectRatio: '16/9',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            {!imageLoaded && (
              <Skeleton
                variant="rectangular"
                width="100%"
                height="100%"
                animation="wave"
              />
            )}
            <img
              src={message.content}
              alt="Message attachment"
              onLoad={handleImageLoad}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: imageLoaded ? 'block' : 'none'
              }}
            />
          </Box>
        )}

        {message.status === MessageStatus.FAILED && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 1,
              color: 'error.main',
              cursor: 'pointer'
            }}
            onClick={handleRetry}
            role="button"
            aria-label="Retry sending message"
            tabIndex={0}
          >
            <ErrorOutline fontSize="small" />
            <Typography variant="caption">
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </Typography>
          </Box>
        )}
      </Paper>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          mt: '4px',
          userSelect: 'none'
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ direction }}
        >
          {formatMessageTime(message.createdAt, language as any)}
        </Typography>
        {isOwn && StatusIndicator}
      </Box>
    </Box>
  );
});

// Display name for debugging
ChatBubble.displayName = 'ChatBubble';

export default ChatBubble;