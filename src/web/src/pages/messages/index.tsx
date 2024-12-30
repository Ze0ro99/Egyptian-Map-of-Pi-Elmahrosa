/**
 * @fileoverview Messages index page component for Egyptian Map of Pi marketplace
 * Implements real-time messaging with RTL support, offline capabilities,
 * and Egyptian market optimizations.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '@mui/material';
import { useTranslation } from 'next-i18next';

import MainLayout from '../../components/layout/MainLayout';
import ConversationList from '../../components/messages/ConversationList';
import useMessages from '../../hooks/useMessages';
import NetworkStatus from '@/components/common/NetworkStatus';

/**
 * Enhanced messages page component with offline support and cultural adaptations
 */
const MessagesPage: React.FC = () => {
  // Hooks initialization
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { 
    conversations,
    loading,
    error,
    connectionQuality,
    refreshConversations
  } = useMessages();

  // Local state
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /**
   * Enhanced conversation selection with offline queueing
   */
  const handleConversationSelect = useCallback((conversationId: string) => {
    if (connectionQuality === 'OFFLINE') {
      // Store selection in queue for when connection returns
      localStorage.setItem('pending_conversation_selection', conversationId);
      return;
    }

    setSelectedId(conversationId);
    router.push({
      pathname: `/messages/${conversationId}`,
      query: { ...router.query }
    });
  }, [router, connectionQuality]);

  /**
   * Process any pending conversation selections when connection returns
   */
  useEffect(() => {
    if (connectionQuality !== 'OFFLINE') {
      const pendingSelection = localStorage.getItem('pending_conversation_selection');
      if (pendingSelection) {
        handleConversationSelect(pendingSelection);
        localStorage.removeItem('pending_conversation_selection');
      }
    }
  }, [connectionQuality, handleConversationSelect]);

  /**
   * Refresh conversations on network status change
   */
  useEffect(() => {
    if (connectionQuality !== 'OFFLINE') {
      refreshConversations();
    }
  }, [connectionQuality, refreshConversations]);

  return (
    <MainLayout>
      <div
        role="main"
        aria-label={t('messages.pageTitle')}
        style={{
          padding: theme.spacing(2),
          direction: theme.direction,
          minHeight: '100vh'
        }}
      >
        {/* Network Status Indicator */}
        <NetworkStatus 
          quality={connectionQuality}
          style={{
            marginBottom: theme.spacing(2),
            textAlign: theme.direction === 'rtl' ? 'right' : 'left'
          }}
        />

        {/* Conversation List */}
        <ConversationList
          onSelectConversation={handleConversationSelect}
          selectedId={selectedId}
          networkQuality={connectionQuality}
          isRTL={theme.direction === 'rtl'}
        />
      </div>
    </MainLayout>
  );
};

// Display name for debugging
MessagesPage.displayName = 'MessagesPage';

export default MessagesPage;