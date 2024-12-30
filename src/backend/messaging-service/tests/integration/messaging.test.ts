/**
 * @fileoverview Integration tests for the Egyptian Map of Pi messaging service
 * Validates real-time communication, Arabic language support, and network resilience
 * @version 1.0.0
 */

import { io, Socket } from 'socket.io-client'; // v4.7.0
import { jest } from '@jest/globals'; // v29.0.0
import { MessageDocument, MessageType, MessageStatus } from '../../src/interfaces/message.interface';

// Test configuration constants
const TEST_CONFIG = {
  SOCKET_URL: 'http://localhost:3000',
  TIMEOUT: 5000,
  NETWORK_DELAY: 100,
  MAX_RETRIES: 3,
};

// Mock services
const mockPiNetworkAuth = {
  validateToken: jest.fn(),
  checkPermissions: jest.fn(),
};

const mockNotificationService = {
  sendMultilingualNotification: jest.fn(),
  trackDeliveryStatus: jest.fn(),
};

describe('Messaging Service Integration Tests', () => {
  let buyerSocket: Socket;
  let sellerSocket: Socket;
  let testTransactionId: string;

  // Helper function to create test messages
  const createTestMessage = async (
    transactionId: string,
    senderId: string,
    content: string,
    contentAr: string,
    type: MessageType = MessageType.TEXT
  ): Promise<Partial<MessageDocument>> => ({
    transactionId,
    senderId,
    content,
    contentAr,
    type,
    status: MessageStatus.SENT,
    metadata: {},
  });

  beforeAll(async () => {
    // Mock Pi Network authentication
    mockPiNetworkAuth.validateToken.mockResolvedValue(true);
    mockPiNetworkAuth.checkPermissions.mockResolvedValue(true);

    // Initialize test transaction
    testTransactionId = 'test-transaction-123';
  });

  beforeEach(async () => {
    // Setup sockets with authentication
    buyerSocket = io(TEST_CONFIG.SOCKET_URL, {
      auth: { token: 'buyer-token' },
      reconnection: true,
      reconnectionAttempts: TEST_CONFIG.MAX_RETRIES,
    });

    sellerSocket = io(TEST_CONFIG.SOCKET_URL, {
      auth: { token: 'seller-token' },
      reconnection: true,
      reconnectionAttempts: TEST_CONFIG.MAX_RETRIES,
    });

    // Wait for connections
    await Promise.all([
      new Promise(resolve => buyerSocket.on('connect', resolve)),
      new Promise(resolve => sellerSocket.on('connect', resolve)),
    ]);
  });

  afterEach(() => {
    buyerSocket.close();
    sellerSocket.close();
    jest.clearAllMocks();
  });

  describe('Message API Endpoints', () => {
    it('should handle Arabic messages correctly', async () => {
      const message = await createTestMessage(
        testTransactionId,
        'buyer-123',
        'Hello, is the item available?',
        'مرحبا، هل العنصر متوفر؟'
      );

      const response = await new Promise(resolve => {
        sellerSocket.on('message:received', resolve);
        buyerSocket.emit('message:send', message);
      });

      expect(response).toMatchObject({
        ...message,
        status: MessageStatus.DELIVERED,
      });
      expect(mockNotificationService.sendMultilingualNotification).toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      const messages = Array(6).fill(null).map(() => 
        createTestMessage(
          testTransactionId,
          'buyer-123',
          'Test message',
          'رسالة اختبار'
        )
      );

      const results = await Promise.all(
        messages.map(msg => new Promise(resolve => {
          buyerSocket.emit('message:send', msg);
          buyerSocket.on('error', resolve);
          buyerSocket.on('message:sent', resolve);
        }))
      );

      expect(results.filter(r => r === 'rate_limit_exceeded')).toHaveLength(1);
    });
  });

  describe('Real-time Messaging', () => {
    it('should handle network disconnections gracefully', async () => {
      const message = await createTestMessage(
        testTransactionId,
        'seller-123',
        'Network test message',
        'رسالة اختبار الشبكة'
      );

      // Simulate network disconnection
      sellerSocket.disconnect();

      // Queue message during offline period
      sellerSocket.emit('message:send', message);

      // Reconnect and verify message delivery
      sellerSocket.connect();
      
      const response = await new Promise(resolve => {
        buyerSocket.on('message:received', resolve);
      });

      expect(response).toMatchObject({
        ...message,
        status: MessageStatus.DELIVERED,
      });
    });

    it('should maintain message order during reconnection', async () => {
      const messages = await Promise.all([
        createTestMessage(testTransactionId, 'seller-123', 'First', 'الأول'),
        createTestMessage(testTransactionId, 'seller-123', 'Second', 'الثاني'),
        createTestMessage(testTransactionId, 'seller-123', 'Third', 'الثالث'),
      ]);

      sellerSocket.disconnect();
      
      // Queue messages while disconnected
      messages.forEach(msg => sellerSocket.emit('message:send', msg));
      
      sellerSocket.connect();

      const receivedMessages = await new Promise(resolve => {
        const received: MessageDocument[] = [];
        buyerSocket.on('message:received', (msg: MessageDocument) => {
          received.push(msg);
          if (received.length === messages.length) resolve(received);
        });
      });

      expect(receivedMessages).toHaveLength(messages.length);
      expect(receivedMessages.map(m => m.content)).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('Notifications', () => {
    it('should support Arabic notifications with correct RTL display', async () => {
      const message = await createTestMessage(
        testTransactionId,
        'buyer-123',
        'Meeting request',
        'طلب مقابلة',
        MessageType.SYSTEM
      );

      buyerSocket.emit('message:send', message);

      expect(mockNotificationService.sendMultilingualNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          content: message.content,
          contentAr: message.contentAr,
          direction: 'rtl',
        })
      );
    });

    it('should handle offline notification queueing', async () => {
      const message = await createTestMessage(
        testTransactionId,
        'seller-123',
        'Offline test notification',
        'إشعار اختبار غير متصل',
        MessageType.SYSTEM
      );

      buyerSocket.disconnect();
      sellerSocket.emit('message:send', message);

      expect(mockNotificationService.trackDeliveryStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'QUEUED',
          retryCount: 0,
        })
      );

      buyerSocket.connect();
      
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.NETWORK_DELAY));
      
      expect(mockNotificationService.trackDeliveryStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'DELIVERED',
        })
      );
    });
  });
});