import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { useMessages } from '../../src/hooks/useMessages';
import { messageApi } from '../../src/api/message.api';
import { useSocket } from '../../src/hooks/useSocket';
import { MessageType, MessageStatus } from '../../src/interfaces/message.interface';

// Mock dependencies
jest.mock('../../src/api/message.api');
jest.mock('../../src/hooks/useSocket');

describe('useMessages Hook', () => {
  // Test conversation ID
  const testConversationId = 'test-conversation-123';

  // Mock messages in Arabic and English
  const mockMessages = [
    {
      id: 'msg1',
      conversationId: testConversationId,
      content: 'مرحبا، كيف حالك؟', // Arabic: "Hello, how are you?"
      type: MessageType.TEXT,
      status: MessageStatus.SENT,
      timestamp: new Date()
    },
    {
      id: 'msg2',
      conversationId: testConversationId,
      content: 'Hello, how are you?',
      type: MessageType.TEXT,
      status: MessageStatus.DELIVERED,
      timestamp: new Date()
    }
  ];

  // Mock conversations
  const mockConversations = [
    {
      id: testConversationId,
      lastMessage: mockMessages[0],
      unreadCount: 2,
      participants: ['user1', 'user2']
    }
  ];

  // Mock socket instance
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock messageApi methods
    (messageApi.getConversations as jest.Mock).mockResolvedValue({
      conversations: mockConversations,
      total: 1,
      hasMore: false
    });

    (messageApi.getConversationMessages as jest.Mock).mockResolvedValue({
      messages: mockMessages,
      total: 2,
      hasMore: false
    });

    (messageApi.sendMessage as jest.Mock).mockImplementation((conversationId, data) => 
      Promise.resolve({
        id: 'new-msg-id',
        conversationId,
        content: data.content,
        type: data.type,
        status: MessageStatus.SENT,
        timestamp: new Date()
      })
    );

    // Mock useSocket hook
    (useSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      connectionStatus: 'CONNECTED',
      networkQuality: 'GOOD'
    });
  });

  it('should handle Arabic messages correctly', async () => {
    const { result } = renderHook(() => useMessages(testConversationId));

    await waitFor(() => {
      expect(result.current.messages).toEqual(mockMessages);
    });

    // Test sending Arabic message
    const arabicMessage = 'مرحبا، هل المنتج متوفر؟'; // "Hello, is the product available?"
    await act(async () => {
      await result.current.sendMessage(arabicMessage);
    });

    expect(messageApi.sendMessage).toHaveBeenCalledWith(
      testConversationId,
      expect.objectContaining({
        content: arabicMessage,
        type: MessageType.TEXT
      })
    );
  });

  it('should handle network interruptions', async () => {
    // Simulate offline state
    (useSocket as jest.Mock).mockReturnValue({
      socket: null,
      connectionStatus: 'DISCONNECTED',
      networkQuality: 'OFFLINE'
    });

    const { result } = renderHook(() => useMessages(testConversationId));

    // Attempt to send message while offline
    const message = 'Test message';
    await act(async () => {
      await result.current.sendMessage(message);
    });

    // Verify message is queued
    expect(result.current.offlineQueue).toContainEqual(
      expect.objectContaining({
        content: message,
        status: MessageStatus.SENT
      })
    );

    // Simulate coming back online
    (useSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      connectionStatus: 'CONNECTED',
      networkQuality: 'GOOD'
    });

    // Verify queued message is sent
    await act(async () => {
      await result.current.retryFailedMessage('new-msg-id');
    });

    expect(messageApi.sendMessage).toHaveBeenCalled();
  });

  it('should handle image uploads with compression', async () => {
    const { result } = renderHook(() => useMessages(testConversationId));

    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockImageUrl = 'https://cdn.example.com/image.jpg';

    (messageApi.uploadImage as jest.Mock).mockResolvedValue(mockImageUrl);

    await act(async () => {
      await result.current.uploadImage(mockFile);
    });

    expect(messageApi.uploadImage).toHaveBeenCalledWith(mockFile);
    expect(messageApi.sendMessage).toHaveBeenCalledWith(
      testConversationId,
      expect.objectContaining({
        content: mockImageUrl,
        type: MessageType.IMAGE
      })
    );
  });

  it('should handle typing indicators', async () => {
    const { result } = renderHook(() => useMessages(testConversationId));

    await act(async () => {
      result.current.setTypingStatus(true);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'typing:start',
      { conversationId: testConversationId }
    );

    await act(async () => {
      result.current.setTypingStatus(false);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'typing:stop',
      { conversationId: testConversationId }
    );
  });

  it('should mark messages as read', async () => {
    const { result } = renderHook(() => useMessages(testConversationId));

    const messageId = mockMessages[0].id;
    await act(async () => {
      await result.current.markAsRead(messageId);
    });

    expect(messageApi.markMessageAsRead).toHaveBeenCalledWith(messageId);
    expect(result.current.messages[0].status).toBe(MessageStatus.READ);
  });

  it('should handle pagination correctly', async () => {
    const { result } = renderHook(() => useMessages(testConversationId));

    await act(async () => {
      await result.current.loadMoreMessages();
    });

    expect(messageApi.getConversationMessages).toHaveBeenCalledWith(
      testConversationId,
      expect.objectContaining({
        page: expect.any(Number),
        limit: expect.any(Number)
      })
    );
  });

  it('should cleanup socket listeners on unmount', () => {
    const { unmount } = renderHook(() => useMessages(testConversationId));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith(`message:${testConversationId}`);
    expect(mockSocket.off).toHaveBeenCalledWith(`typing:${testConversationId}`);
  });

  it('should handle connection quality changes', async () => {
    const { result, rerender } = renderHook(() => useMessages(testConversationId));

    // Simulate poor connection
    (useSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      connectionStatus: 'CONNECTED',
      networkQuality: 'POOR'
    });

    rerender();

    expect(result.current.connectionQuality).toBe('POOR');

    // Verify message delivery confirmation on poor connection
    const message = 'Test message';
    await act(async () => {
      await result.current.sendMessage(message);
    });

    expect(messageApi.sendMessage).toHaveBeenCalledWith(
      testConversationId,
      expect.objectContaining({
        content: message,
        type: MessageType.TEXT
      })
    );
  });
});