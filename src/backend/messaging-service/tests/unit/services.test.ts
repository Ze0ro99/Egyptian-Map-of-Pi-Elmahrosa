/**
 * @fileoverview Unit tests for messaging service components including Socket.IO functionality,
 * notification delivery, and message management with Arabic content support
 * Version: 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'; // v29.0.0
import { Server } from 'socket.io'; // v4.7.0
import { Socket } from 'socket.io-client'; // v4.7.0
import * as admin from 'firebase-admin'; // v11.0.0
import { SocketService } from '../../src/services/socket.service';
import { NotificationService } from '../../src/services/notification.service';
import { MessageType, MessageStatus } from '../../src/interfaces/message.interface';
import { createSocketConfig } from '../../src/config/socket.config';

// Test constants
const TEST_USER_ID = 'test-user-123';
const TEST_PI_TOKEN = 'test-pi-token-123';
const TEST_FCM_TOKEN = 'test-fcm-token-123';
const TEST_MESSAGE_AR = {
  transactionId: 'test-transaction-123',
  senderId: 'test-sender-123',
  content: 'رسالة اختبار',
  contentAr: 'رسالة اختبار',
  type: MessageType.TEXT,
  direction: 'RTL'
};
const TEST_MESSAGE_EN = {
  transactionId: 'test-transaction-123',
  senderId: 'test-sender-123',
  content: 'Test message content',
  contentAr: 'محتوى رسالة اختبار',
  type: MessageType.TEXT,
  direction: 'LTR'
};

describe('SocketService', () => {
  let socketService: SocketService;
  let mockServer: Server;
  let mockSocket: Socket;
  let mockPiAuthService: any;
  let mockRedisAdapter: any;

  beforeEach(() => {
    // Mock Pi Network authentication service
    mockPiAuthService = {
      verifyToken: jest.fn().mockResolvedValue({
        id: TEST_USER_ID,
        username: 'testuser'
      })
    };

    // Mock Redis adapter
    mockRedisAdapter = {
      on: jest.fn(),
      emit: jest.fn()
    };

    // Initialize Socket.IO server with test configuration
    mockServer = new Server(createSocketConfig({
      connectionQualityConfig: {
        healthCheckInterval: 1000,
        degradationThreshold: 500
      }
    }));

    socketService = new SocketService(mockPiAuthService, mockRedisAdapter);
    socketService.initialize(mockServer);
  });

  afterEach(() => {
    mockServer.close();
    jest.clearAllMocks();
  });

  test('should authenticate user with valid Pi Network token', async () => {
    const mockHandshake = {
      auth: { token: TEST_PI_TOKEN }
    };

    await expect(socketService['setupMiddleware'](mockHandshake as any))
      .resolves.not.toThrow();
    expect(mockPiAuthService.verifyToken).toHaveBeenCalledWith(TEST_PI_TOKEN);
  });

  test('should handle Arabic message content correctly', async () => {
    const processedContent = await socketService['handleArabicContent'](
      TEST_MESSAGE_AR.content,
      TEST_MESSAGE_AR.direction
    );

    expect(processedContent).toContain('\u202B'); // RTL mark
    expect(processedContent).toContain('\u202C'); // Pop directional formatting
    expect(processedContent).toContain(TEST_MESSAGE_AR.content);
  });

  test('should enforce rate limiting for message sending', () => {
    const mockSocket = {
      data: { user: { id: TEST_USER_ID } },
      emit: jest.fn()
    };

    // Send messages up to rate limit
    for (let i = 0; i < 60; i++) {
      expect(socketService['checkRateLimit'](mockSocket as any)).toBeTruthy();
    }

    // Next message should be rate limited
    expect(socketService['checkRateLimit'](mockSocket as any)).toBeFalsy();
    expect(mockSocket.emit).toHaveBeenCalledWith('rate_limit_warning', expect.any(Object));
  });

  test('should monitor connection quality', (done) => {
    const mockSocket = {
      emit: jest.fn(),
      on: jest.fn()
    };

    socketService['setupConnectionQualityMonitoring'](mockSocket as any);

    // Simulate high latency
    mockSocket.emit.mockImplementation((event: string, callback?: Function) => {
      if (event === 'ping' && callback) {
        setTimeout(() => callback(), 600); // Simulate 600ms latency
      }
    });

    setTimeout(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'connection_quality_warning',
        expect.any(Object)
      );
      done();
    }, 1100);
  });
});

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockFCM: any;

  beforeEach(() => {
    // Mock Firebase Cloud Messaging
    mockFCM = {
      sendMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }]
      }),
      getTokensValidityInfo: jest.fn().mockResolvedValue({
        validTokens: [true]
      })
    };

    // Mock Firebase Admin initialization
    jest.spyOn(admin, 'initializeApp').mockImplementation();
    jest.spyOn(admin, 'messaging').mockReturnValue(mockFCM);

    notificationService = new NotificationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should send message notification with Arabic content', async () => {
    const message = {
      id: 'test-message-123',
      ...TEST_MESSAGE_AR,
      receiverId: 'test-receiver-123',
      status: MessageStatus.SENT
    };

    await notificationService.sendMessageNotification(message, message.receiverId, 'ar');

    expect(mockFCM.sendMulticast).toHaveBeenCalledWith(expect.objectContaining({
      notification: {
        title: expect.stringContaining('رسالة'),
        body: message.contentAr
      },
      android: expect.objectContaining({
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'messages'
        }
      })
    }));
  });

  test('should handle status update notifications', async () => {
    await notificationService.sendStatusUpdateNotification(
      'test-message-123',
      MessageStatus.DELIVERED,
      'test-receiver-123',
      'ar'
    );

    expect(mockFCM.sendMulticast).toHaveBeenCalledWith(expect.objectContaining({
      notification: {
        title: expect.stringContaining('تحديث'),
        body: expect.stringContaining(MessageStatus.DELIVERED)
      },
      data: {
        type: 'STATUS_UPDATE',
        status: MessageStatus.DELIVERED
      }
    }));
  });

  test('should validate FCM tokens before sending', async () => {
    const invalidToken = 'invalid-token';
    mockFCM.getTokensValidityInfo.mockResolvedValueOnce({
      validTokens: [false]
    });

    await notificationService['getValidTokens']('test-user-123');

    expect(mockFCM.getTokensValidityInfo).toHaveBeenCalled();
    expect(notificationService['userTokens'].get('test-user-123')).toEqual([]);
  });

  test('should handle FCM delivery failures', async () => {
    mockFCM.sendMulticast.mockResolvedValueOnce({
      successCount: 0,
      failureCount: 1,
      responses: [{
        success: false,
        error: { code: 'messaging/invalid-token' }
      }]
    });

    const tokens = [TEST_FCM_TOKEN];
    notificationService['handleFcmResponse'](
      await mockFCM.sendMulticast({}),
      TEST_USER_ID,
      tokens
    );

    expect(notificationService['userTokens'].get(TEST_USER_ID)).toEqual([]);
  });
});