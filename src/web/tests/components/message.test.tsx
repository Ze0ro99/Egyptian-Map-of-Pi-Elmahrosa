import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from '@mui/material';
import axe from '@axe-core/react';
import ChatBubble from '../../src/components/messages/ChatBubble';
import ChatInput from '../../src/components/messages/ChatInput';
import MessageList from '../../src/components/messages/MessageList';
import { MessageType, MessageStatus } from '../../src/interfaces/message.interface';

// Mock hooks and services
vi.mock('../../src/hooks/useSocket', () => ({
  useSocket: () => ({
    sendMessage: vi.fn(),
    connectionStatus: 'CONNECTED',
    networkQuality: 'EXCELLENT',
    subscribeToMessages: vi.fn()
  })
}));

vi.mock('../../src/hooks/useMessages', () => ({
  useMessages: () => ({
    messages: mockMessages,
    loading: false,
    error: null,
    hasMore: true,
    connectionQuality: 'EXCELLENT',
    participantTyping: null,
    loadMoreMessages: vi.fn(),
    markAsRead: vi.fn(),
    retryFailedMessage: vi.fn()
  })
}));

// Test data
const mockMessages = [
  {
    id: 'msg1',
    content: 'Hello',
    type: MessageType.TEXT,
    status: MessageStatus.DELIVERED,
    senderId: 'user1',
    createdAt: new Date('2023-01-01T12:00:00Z')
  },
  {
    id: 'msg2',
    content: 'مرحبا',
    type: MessageType.TEXT,
    status: MessageStatus.SENT,
    senderId: 'user2',
    createdAt: new Date('2023-01-01T12:01:00Z')
  }
];

// Test utilities
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={useTheme()}>
      {component}
    </ThemeProvider>
  );
};

describe('ChatBubble Component', () => {
  it('renders text messages correctly in LTR mode', () => {
    const { container } = renderWithTheme(
      <ChatBubble
        message={mockMessages[0]}
        isOwn={true}
        language="en"
      />
    );
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({ direction: 'ltr' });
  });

  it('renders text messages correctly in RTL mode', () => {
    const { container } = renderWithTheme(
      <ChatBubble
        message={mockMessages[1]}
        isOwn={false}
        language="ar"
      />
    );
    
    expect(screen.getByText('مرحبا')).toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({ direction: 'rtl' });
  });

  it('handles image messages with lazy loading', async () => {
    const imageMessage = {
      ...mockMessages[0],
      type: MessageType.IMAGE,
      content: 'https://example.com/image.jpg'
    };

    renderWithTheme(
      <ChatBubble
        message={imageMessage}
        isOwn={true}
        language="en"
      />
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('loading', 'lazy');
    await waitFor(() => {
      expect(image).toBeVisible();
    });
  });

  it('shows retry button for failed messages', () => {
    const failedMessage = {
      ...mockMessages[0],
      status: MessageStatus.FAILED
    };

    const onRetry = vi.fn();
    renderWithTheme(
      <ChatBubble
        message={failedMessage}
        isOwn={true}
        language="ar"
        onRetry={onRetry}
      />
    );

    const retryButton = screen.getByRole('button', { name: /إعادة المحاولة/i });
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledWith(failedMessage.id);
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithTheme(
      <ChatBubble
        message={mockMessages[0]}
        isOwn={true}
        language="en"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ChatInput Component', () => {
  it('handles text input and validation', async () => {
    const onMessageSent = vi.fn();
    renderWithTheme(
      <ChatInput
        onMessageSent={onMessageSent}
        maxLength={100}
        language="ar"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'مرحبا' } });
    fireEvent.click(screen.getByRole('button', { name: /إرسال/i }));

    await waitFor(() => {
      expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({
        content: 'مرحبا',
        type: MessageType.TEXT
      }));
    });
  });

  it('enforces message length restrictions', () => {
    const maxLength = 10;
    renderWithTheme(
      <ChatInput
        onMessageSent={vi.fn()}
        maxLength={maxLength}
        language="en"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'x'.repeat(maxLength + 1) } });
    
    expect(screen.getByText(/exceeds maximum length/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles network errors gracefully', async () => {
    const onMessageSent = vi.fn().mockRejectedValue(new Error('Network error'));
    renderWithTheme(
      <ChatInput
        onMessageSent={onMessageSent}
        language="ar"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'مرحبا' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/فشل إرسال الرسالة/i)).toBeInTheDocument();
    });
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithTheme(
      <ChatInput
        onMessageSent={vi.fn()}
        language="en"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('MessageList Component', () => {
  it('renders messages with infinite scroll', async () => {
    const onLoadMore = vi.fn();
    renderWithTheme(
      <MessageList
        conversationId="conv1"
        currentUserId="user1"
        language="en"
        onLoadMore={onLoadMore}
      />
    );

    const messages = screen.getAllByRole('article');
    expect(messages).toHaveLength(mockMessages.length);

    // Simulate scroll to top
    fireEvent.scroll(window, { target: { scrollY: 0 } });

    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalled();
    });
  });

  it('handles network quality indicators', () => {
    vi.mocked(useSocket).mockImplementation(() => ({
      ...vi.mocked(useSocket)(),
      networkQuality: 'POOR'
    }));

    renderWithTheme(
      <MessageList
        conversationId="conv1"
        currentUserId="user1"
        language="ar"
      />
    );

    expect(screen.getByText(/جودة الاتصال ضعيفة/i)).toBeInTheDocument();
  });

  it('shows typing indicators', () => {
    vi.mocked(useMessages).mockImplementation(() => ({
      ...vi.mocked(useMessages)(),
      participantTyping: {
        isTyping: true,
        userId: 'user2',
        timestamp: Date.now()
      }
    }));

    renderWithTheme(
      <MessageList
        conversationId="conv1"
        currentUserId="user1"
        language="ar"
      />
    );

    expect(screen.getByText(/جاري الكتابة/i)).toBeInTheDocument();
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithTheme(
      <MessageList
        conversationId="conv1"
        currentUserId="user1"
        language="en"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});