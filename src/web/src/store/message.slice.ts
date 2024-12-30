/**
 * @fileoverview Redux slice for managing real-time messaging state in the Egyptian Map of Pi marketplace.
 * Implements secure message handling, Arabic language support, and RTL text direction.
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.5
import CryptoJS from 'crypto-js'; // v4.1.1
import { IMessage, IConversation } from '../interfaces/message.interface';
import { Language } from '../interfaces/user.interface';

/**
 * Text direction enumeration for RTL/LTR support
 */
export enum TextDirection {
  RTL = 'rtl',
  LTR = 'ltr'
}

/**
 * Message language enumeration
 */
export enum MessageLanguage {
  ARABIC = 'ar',
  ENGLISH = 'en'
}

/**
 * Interface defining the message slice state structure
 */
interface MessageState {
  conversations: IConversation[];
  messagesByConversation: Record<string, IMessage[]>;
  loading: boolean;
  error: string | null;
  activeConversationId: string | null;
  encryptionStatus: Record<string, boolean>;
  currentTextDirection: TextDirection;
  currentLanguage: MessageLanguage;
}

/**
 * Initial state for the message slice
 */
const initialState: MessageState = {
  conversations: [],
  messagesByConversation: {},
  loading: false,
  error: null,
  activeConversationId: null,
  encryptionStatus: {},
  currentTextDirection: TextDirection.RTL, // Default to RTL for Arabic
  currentLanguage: MessageLanguage.ARABIC // Default to Arabic
};

/**
 * Helper function to encrypt sensitive message content
 */
const encryptMessage = (content: string, key: string): string => {
  return CryptoJS.AES.encrypt(content, key).toString();
};

/**
 * Helper function to decrypt message content
 */
const decryptMessage = (encryptedContent: string, key: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedContent, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Helper function to detect text direction based on content
 */
const detectTextDirection = (content: string): TextDirection => {
  const rtlPattern = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlPattern.test(content) ? TextDirection.RTL : TextDirection.LTR;
};

/**
 * Helper function to detect message language
 */
const detectLanguage = (content: string): MessageLanguage => {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(content) ? MessageLanguage.ARABIC : MessageLanguage.ENGLISH;
};

/**
 * Message slice implementation with enhanced security and language support
 */
const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    /**
     * Set conversations with encryption status initialization
     */
    setConversations: (state, action: PayloadAction<IConversation[]>) => {
      state.conversations = action.payload;
      state.loading = false;
      state.error = null;
      
      // Initialize encryption status for new conversations
      action.payload.forEach(conversation => {
        if (!state.encryptionStatus[conversation.id]) {
          state.encryptionStatus[conversation.id] = true;
        }
      });
    },

    /**
     * Add a new message with encryption and language detection
     */
    addMessage: (state, action: PayloadAction<{ conversationId: string, message: IMessage }>) => {
      const { conversationId, message } = action.payload;
      
      // Detect language and set direction
      const detectedLanguage = detectLanguage(message.content);
      const textDirection = detectTextDirection(message.content);
      
      // Encrypt message content if encryption is enabled
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation && state.encryptionStatus[conversationId]) {
        message.encryptedContent = encryptMessage(message.content, conversation.encryptionKey);
      }

      // Initialize messages array if needed
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      // Add message to conversation
      state.messagesByConversation[conversationId].push({
        ...message,
        direction: textDirection,
        language: detectedLanguage
      });

      // Update conversation's last message
      const conversationIndex = state.conversations.findIndex(c => c.id === conversationId);
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex].lastMessage = message;
        state.conversations[conversationIndex].unreadCount += 1;
      }
    },

    /**
     * Set active conversation
     */
    setActiveConversation: (state, action: PayloadAction<string>) => {
      state.activeConversationId = action.payload;
      
      // Reset unread count when conversation becomes active
      const conversationIndex = state.conversations.findIndex(c => c.id === action.payload);
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex].unreadCount = 0;
      }
    },

    /**
     * Toggle message encryption for a conversation
     */
    toggleEncryption: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      state.encryptionStatus[conversationId] = !state.encryptionStatus[conversationId];
    },

    /**
     * Set message language preference
     */
    setMessageLanguage: (state, action: PayloadAction<MessageLanguage>) => {
      state.currentLanguage = action.payload;
      state.currentTextDirection = action.payload === MessageLanguage.ARABIC ? 
        TextDirection.RTL : TextDirection.LTR;
    },

    /**
     * Set text direction manually
     */
    setTextDirection: (state, action: PayloadAction<TextDirection>) => {
      state.currentTextDirection = action.payload;
    },

    /**
     * Mark messages as read
     */
    markMessagesAsRead: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      const conversationIndex = state.conversations.findIndex(c => c.id === conversationId);
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex].unreadCount = 0;
      }
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

// Export actions and reducer
export const {
  setConversations,
  addMessage,
  setActiveConversation,
  toggleEncryption,
  setMessageLanguage,
  setTextDirection,
  markMessagesAsRead,
  setLoading,
  setError
} = messageSlice.actions;

export default messageSlice.reducer;