/**
 * @fileoverview Enhanced chat input component for Egyptian Map of Pi marketplace
 * Implements real-time messaging with Arabic support, offline queueing,
 * and proper RTL layout for Egyptian users.
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';
import { IMessage, MessageType, MessageStatus } from '../../interfaces/message.interface';
import { useSocket } from '../../hooks/useSocket';
import CustomButton from '../common/Button';
import { validateArabicText } from '../../utils/validation.util';

// Styled components for RTL support and mobile optimization
const ChatInputContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  position: 'sticky',
  bottom: 0,
  width: '100%',
  direction: theme.direction,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  flex: 1,
  '& .MuiInputBase-root': {
    borderRadius: theme.shape.borderRadius * 2,
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.background.default,
  },
  '& .MuiInputBase-input': {
    fontFamily: theme.direction === 'rtl' 
      ? theme.typography.fontFamilyArabic 
      : theme.typography.fontFamily,
  },
}));

// Props interface
interface ChatInputProps {
  transactionId: string;
  onMessageSent: (message: IMessage) => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Enhanced chat input component with Arabic support and offline resilience
 */
const ChatInput = React.memo<ChatInputProps>(({
  transactionId,
  onMessageSent,
  disabled = false,
  maxLength = 500,
  placeholder,
  autoFocus = false,
}) => {
  // State and hooks
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { sendMessage, connectionStatus } = useSocket();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles text input changes with Arabic validation
   */
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setError(null);

    try {
      if (value.length > maxLength) {
        setError(t('errors.message.tooLong', { max: maxLength }));
        return;
      }

      // Validate Arabic text input
      if (value) {
        validateArabicText(value);
      }

      setMessage(value);
    } catch (error) {
      setError(t('errors.message.invalidCharacters'));
    }
  }, [maxLength, t]);

  /**
   * Handles message submission with offline support
   */
  const handleSendMessage = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    
    if (!message.trim() || loading || disabled) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create message object
      const newMessage: IMessage = {
        id: crypto.randomUUID(),
        transactionId,
        senderId: '', // Will be set by backend
        content: message.trim(),
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Send message with offline support
      await sendMessage(newMessage);
      
      // Clear input and notify parent
      setMessage('');
      onMessageSent(newMessage);
      
      // Focus input after sending
      inputRef.current?.focus();
    } catch (error) {
      setError(t('errors.message.sendFailed'));
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  }, [message, loading, disabled, transactionId, sendMessage, onMessageSent, t]);

  return (
    <ChatInputContainer>
      <StyledTextField
        inputRef={inputRef}
        fullWidth
        multiline
        maxRows={4}
        value={message}
        onChange={handleInputChange}
        disabled={disabled}
        error={!!error}
        helperText={error}
        placeholder={placeholder || t('messages.typeMessage')}
        autoFocus={autoFocus}
        inputProps={{
          maxLength: maxLength + 1, // +1 to allow validation message
          'aria-label': t('messages.messageInput'),
        }}
      />
      <CustomButton
        onClick={handleSendMessage}
        disabled={!message.trim() || disabled || !!error}
        loading={loading}
        color="primary"
        aria-label={t('messages.send')}
        size="large"
      >
        {t('messages.send')}
      </CustomButton>
    </ChatInputContainer>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;