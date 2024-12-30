/**
 * @fileoverview Frontend service for managing real-time messaging functionality
 * between buyers and sellers in the Egyptian Map of Pi marketplace.
 * Implements enhanced network resilience, Arabic language support, and local market optimizations.
 * @version 1.0.0
 */

import { BehaviorSubject } from 'rxjs'; // ^7.8.0
import { retry, catchError } from 'rxjs/operators'; // ^7.8.0
import imageCompression from 'browser-image-compression'; // ^2.0.0

import { IMessage, IConversation, MessageType, MessageStatus } from '../interfaces/message.interface';
import { messageApi } from '../api/message.api';
import { getErrorMessage } from '../constants/errors';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

/**
 * Network connection states for enhanced resilience
 */
enum ConnectionState {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING'
}

/**
 * Interface for pending messages during offline mode
 */
interface PendingMessage {
  id: string;
  conversationId: string;
  content: string;
  type: MessageType;
  retryCount: number;
  timestamp: Date;
}

/**
 * Enhanced message service with Egyptian market optimizations
 */
export class MessageService {
  // Reactive state streams
  public readonly messages$ = new BehaviorSubject<IMessage[]>([]);
  public readonly conversations$ = new BehaviorSubject<IConversation[]>([]);
  public readonly connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);

  // Message queue for offline support
  private readonly messageQueue: PendingMessage[] = [];
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5 seconds
  private readonly maxQueueSize = 100;

  // Local storage keys
  private readonly STORAGE_KEYS = {
    PENDING_MESSAGES: 'emp_pending_messages',
    CONVERSATIONS: 'emp_conversations',
    MESSAGES: 'emp_messages'
  };

  constructor() {
    this.initializeService();
  }

  /**
   * Initializes the message service with enhanced resilience
   */
  private async initializeService(): Promise<void> {
    try {
      // Load cached data
      this.loadCachedData();

      // Initialize WebSocket connection
      await this.initializeSocket();

      // Start message queue processor
      this.startMessageQueueProcessor();

      // Load conversations
      await this.loadConversations();

    } catch (error) {
      console.error('Message service initialization failed:', error);
      this.handleError(error);
    }
  }

  /**
   * Initializes WebSocket connection with enhanced resilience
   */
  private async initializeSocket(): Promise<void> {
    try {
      // Subscribe to connection state changes
      messageApi.subscribeToPresence('system', (state: any) => {
        this.connectionState$.next(state.connected ? 
          ConnectionState.CONNECTED : ConnectionState.DISCONNECTED);
      });

      // Process queued messages on reconnection
      this.connectionState$.subscribe(async (state) => {
        if (state === ConnectionState.CONNECTED) {
          await this.processMessageQueue();
        }
      });

    } catch (error) {
      this.connectionState$.next(ConnectionState.DISCONNECTED);
      throw error;
    }
  }

  /**
   * Loads conversations with pagination and caching
   */
  private async loadConversations(): Promise<void> {
    try {
      const { conversations } = await messageApi.getConversations({
        limit: 20,
        page: 1
      });
      this.conversations$.next(conversations);
      this.cacheData(this.STORAGE_KEYS.CONVERSATIONS, conversations);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Sends a message with enhanced reliability and offline support
   */
  public async sendMessage(
    conversationId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    attachments?: File[]
  ): Promise<void> {
    try {
      // Prepare message data
      const messageData: any = {
        content,
        type,
        status: MessageStatus.SENT,
        timestamp: new Date()
      };

      // Handle attachments if present
      if (attachments?.length) {
        messageData.attachments = await this.processAttachments(attachments);
      }

      // Attempt to send message
      if (this.connectionState$.value === ConnectionState.CONNECTED) {
        const message = await messageApi.sendMessage(conversationId, messageData);
        this.updateMessages(message);
      } else {
        // Queue message for later delivery
        this.queueMessage({
          id: crypto.randomUUID(),
          conversationId,
          content,
          type,
          retryCount: 0,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.handleError(error);
      // Queue message on error
      this.queueMessage({
        id: crypto.randomUUID(),
        conversationId,
        content,
        type,
        retryCount: 0,
        timestamp: new Date()
      });
    }
  }

  /**
   * Processes message attachments with optimization for Egyptian network conditions
   */
  private async processAttachments(files: File[]): Promise<string[]> {
    const processedUrls: string[] = [];

    for (const file of files) {
      try {
        // Optimize images for slower networks
        if (file.type.startsWith('image/')) {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1024,
            useWebWorker: true
          });
          const url = await messageApi.uploadMessageImage(compressedFile);
          processedUrls.push(url);
        }
      } catch (error) {
        console.error('Attachment processing failed:', error);
      }
    }

    return processedUrls;
  }

  /**
   * Queues a message for later delivery
   */
  private queueMessage(message: PendingMessage): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift(); // Remove oldest message if queue is full
    }
    this.messageQueue.push(message);
    this.cacheData(this.STORAGE_KEYS.PENDING_MESSAGES, this.messageQueue);
  }

  /**
   * Processes queued messages during reconnection
   */
  private async processMessageQueue(): Promise<void> {
    if (!this.messageQueue.length) return;

    for (const message of [...this.messageQueue]) {
      try {
        if (message.retryCount < this.maxRetries) {
          await messageApi.sendMessage(message.conversationId, {
            content: message.content,
            type: message.type
          });
          
          // Remove successfully sent message from queue
          const index = this.messageQueue.findIndex(m => m.id === message.id);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }
        } else {
          // Remove failed message after max retries
          const index = this.messageQueue.findIndex(m => m.id === message.id);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }
        }
      } catch (error) {
        message.retryCount++;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    this.cacheData(this.STORAGE_KEYS.PENDING_MESSAGES, this.messageQueue);
  }

  /**
   * Updates local message state and triggers UI updates
   */
  private updateMessages(message: IMessage): void {
    const currentMessages = this.messages$.value;
    this.messages$.next([...currentMessages, message]);
    this.cacheData(this.STORAGE_KEYS.MESSAGES, this.messages$.value);
  }

  /**
   * Loads cached data from local storage
   */
  private loadCachedData(): void {
    try {
      const cachedMessages = localStorage.getItem(this.STORAGE_KEYS.MESSAGES);
      const cachedConversations = localStorage.getItem(this.STORAGE_KEYS.CONVERSATIONS);
      const cachedPendingMessages = localStorage.getItem(this.STORAGE_KEYS.PENDING_MESSAGES);

      if (cachedMessages) {
        this.messages$.next(JSON.parse(cachedMessages));
      }
      if (cachedConversations) {
        this.conversations$.next(JSON.parse(cachedConversations));
      }
      if (cachedPendingMessages) {
        this.messageQueue.push(...JSON.parse(cachedPendingMessages));
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }

  /**
   * Caches data in local storage
   */
  private cacheData(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Handles errors with localized messages
   */
  private handleError(error: any): void {
    const errorMessage = getErrorMessage(
      error.code || ErrorCodes.NETWORK_REQUEST_FAILED,
      'ar'
    );
    console.error('Message service error:', errorMessage, error);
  }

  /**
   * Starts the message queue processor
   */
  private startMessageQueueProcessor(): void {
    setInterval(async () => {
      if (this.connectionState$.value === ConnectionState.CONNECTED) {
        await this.processMessageQueue();
      }
    }, this.retryDelay);
  }
}