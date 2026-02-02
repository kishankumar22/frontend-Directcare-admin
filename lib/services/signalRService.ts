// lib/services/signalRService.ts
import * as signalR from '@microsoft/signalr';

interface TakeoverNotification {
  id: string;
  requestId: string;
  productId: string;
  productName: string;
  requestedByUserId: string;
  requestedByEmail: string;
  currentEditorUserId: string;
  currentEditorEmail: string;
  requestMessage?: string;
  expiresAt: string;
  timeLeftSeconds: number;
}

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;
  private connectionPromise: Promise<boolean> | null = null;

  async startConnection(userId: string): Promise<boolean> {
    // ✅ RETURN EXISTING CONNECTION PROMISE
    if (this.connectionPromise) {
      console.log('⏳ Using existing connection attempt...');
      return this.connectionPromise;
    }

    // ✅ ALREADY CONNECTED
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('✅ SignalR already connected');
      return true;
    }

    // ✅ CREATE NEW CONNECTION PROMISE
    this.connectionPromise = this._connect(userId);
    return this.connectionPromise;
  }

  private async _connect(userId: string): Promise<boolean> {
    this.isConnecting = true;

    try {
      console.log('==================== 🚀 SIGNALR INIT ====================');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://warehouseapi.mezzex.com';
      const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
      
      console.log('📍 API URL:', apiUrl);
      console.log('🔑 Token exists:', !!token);
      console.log('👤 User ID:', userId);

      if (!token) {
        console.error('❌ No authentication token found');
        this.connectionPromise = null;
        return false;
      }

      const hubUrl = `${apiUrl}/hubs/product-lock`;
      console.log('🔗 Hub URL:', hubUrl);

      // ✅ OPTIONAL: Test negotiate (skip in production for faster connection)
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 Testing negotiate endpoint...');
        try {
          const negotiateUrl = `${hubUrl}/negotiate?negotiateVersion=1`;
          
          const testResponse = await fetch(negotiateUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
          
          console.log('📊 Negotiate status:', testResponse.status);
          
          if (testResponse.ok) {
            console.log('✅ Negotiate successful');
          } else {
            console.warn('⚠️ Negotiate failed but continuing...');
          }
        } catch (negotiateError: any) {
          console.warn('⚠️ Negotiate test failed, continuing...', negotiateError.message);
        }
      }

      console.log('🔨 Building SignalR connection...');

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => {
            // ✅ Always get fresh token
            const currentToken = localStorage.getItem('authToken') || 
                                localStorage.getItem('accessToken');
            
            if (!currentToken) {
              console.error('❌ Token missing during connection');
            }
            
            return currentToken || '';
          },
          transport: signalR.HttpTransportType.WebSockets | 
                    signalR.HttpTransportType.ServerSentEvents |
                    signalR.HttpTransportType.LongPolling,
          skipNegotiation: false,
          withCredentials: true,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount >= 10) {
              console.error('❌ Max reconnect attempts reached');
              return null;
            }
            
            // Exponential backoff: 0ms, 2s, 10s, 30s, 60s
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;
            if (retryContext.previousRetryCount < 5) return 30000;
            return 60000;
          }
        })
        .configureLogging(
          process.env.NODE_ENV === 'development' 
            ? signalR.LogLevel.Information 
            : signalR.LogLevel.Warning
        )
        .build();

      // ✅ Setup event handlers BEFORE starting connection
      this.setupEventHandlers();

      // Setup lifecycle handlers
      this.connection.onreconnecting((error) => {
        console.warn('⚠️ SignalR reconnecting...', error?.message);
        this.reconnectAttempts++;
      });

      this.connection.onreconnected((connectionId) => {
        console.log('✅ SignalR reconnected, ID:', connectionId);
        this.reconnectAttempts = 0;
      });

      this.connection.onclose((error) => {
        console.error('❌ SignalR connection closed:', error?.message);
        this.isConnecting = false;
        this.connectionPromise = null;
      });

      console.log('🚀 Starting connection...');
      
      // ✅ Start with timeout
      await Promise.race([
        this.connection.start(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout (15s)')), 15000)
        )
      ]);

      console.log('==================== ✅ CONNECTED! ====================');
      console.log('🆔 Connection ID:', this.connection.connectionId);
      console.log('📡 State:', signalR.HubConnectionState[this.connection.state]);
      console.log('====================================================');

      return true;

    } catch (error: any) {
      console.error('==================== ❌ CONNECTION FAILED ====================');
      console.error('Message:', error.message);
      this.logErrorGuidance(error);
      console.error('=============================================================');

      this.connection = null;
      this.connectionPromise = null;
      return false;

    } finally {
      this.isConnecting = false;
    }
  }

  // ✅ FIXED: All event handlers with proper data transformation
  private setupEventHandlers() {
    if (!this.connection) return;

    // ✅ EVENT 1: Takeover Request Received
    this.connection.on('TakeoverRequestReceived', (data: TakeoverNotification) => {
      console.log('🔔 ==================== TAKEOVER REQUEST ====================');
      console.log('📦 Product:', data.productName);
      console.log('👤 Requester:', data.requestedByEmail);
      console.log('👥 Current Editor:', data.currentEditorEmail);
      console.log('💬 Message:', data.requestMessage);
      console.log('⏰ Expires:', data.expiresAt);
      console.log('⏱️ Time Left:', data.timeLeftSeconds, 'seconds');
      console.log('=========================================================');
      
      this.emit('takeoverRequest', data);
    });

    // ✅ EVENT 2: Takeover Approved - FIXED TO HANDLE STRING
    this.connection.on('TakeoverRequestApproved', (productIdOrData: any) => {
      console.log('✅ ==================== TAKEOVER APPROVED ====================');
      console.log('📦 Raw data:', productIdOrData);
      console.log('📦 Type:', typeof productIdOrData);
      
      // ✅ TRANSFORM: Backend sends string, we need object
      let normalizedData;
      
      if (typeof productIdOrData === 'string') {
        // Backend sent just productId string
        normalizedData = { productId: productIdOrData };
        console.log('✅ Transformed string to object:', normalizedData);
      } else if (productIdOrData?.productId) {
        // Backend sent full object
        normalizedData = productIdOrData;
        console.log('✅ Using object as-is');
      } else {
        // Fallback
        console.warn('⚠️ Unknown format, using as-is:', productIdOrData);
        normalizedData = productIdOrData;
      }
      
      console.log('📤 Emitting to handlers:', JSON.stringify(normalizedData));
      console.log('=========================================================');
      
      this.emit('takeoverApproved', normalizedData);
    });

    // ✅ EVENT 3: Takeover Rejected - handles multiple formats
    this.connection.on('TakeoverRequestRejected', (requestIdOrData: any, optionalData?: any) => {
      console.log('❌ ==================== TAKEOVER REJECTED ====================');
      console.log('📦 Arg 1:', requestIdOrData);
      console.log('📦 Arg 2:', optionalData);
      
      let normalizedData;
      
      // Case 1: Backend sends (requestId, dataObject)
      if (optionalData && typeof optionalData === 'object') {
        normalizedData = optionalData;
        console.log('✅ Using arg 2 (full object)');
      }
      // Case 2: Backend sends full object in arg 1
      else if (typeof requestIdOrData === 'object' && requestIdOrData !== null) {
        normalizedData = requestIdOrData;
        console.log('✅ Using arg 1 (object)');
      }
      // Case 3: Backend sends only requestId string
      else if (typeof requestIdOrData === 'string') {
        normalizedData = requestIdOrData; // Pass string as-is
        console.log('⚠️ Using arg 1 (string only)');
      }
      // Case 4: Unknown format
      else {
        console.warn('⚠️ Unknown data format:', requestIdOrData);
        normalizedData = requestIdOrData;
      }
      
      console.log('📤 Emitting:', JSON.stringify(normalizedData));
      console.log('=========================================================');
      
      this.emit('takeoverRejected', normalizedData);
    });

    // ✅ FALLBACK: Alternative event name for rejection
    this.connection.on('TakeoverRejected', (requestIdOrData: any, optionalData?: any) => {
      console.log('❌ TAKEOVER REJECTED (alternative event)');
      
      let normalizedData;
      if (optionalData && typeof optionalData === 'object') {
        normalizedData = optionalData;
      } else if (typeof requestIdOrData === 'object' && requestIdOrData !== null) {
        normalizedData = requestIdOrData;
      } else if (typeof requestIdOrData === 'string') {
        normalizedData = requestIdOrData;
      } else {
        normalizedData = requestIdOrData;
      }
      
      this.emit('takeoverRejected', normalizedData);
    });

    // ✅ EVENT 4: Takeover Expired
    this.connection.on('TakeoverRequestExpired', (requestIdOrData: any) => {
      console.log('⏰ ==================== TAKEOVER EXPIRED ====================');
      console.log('📦 Raw data:', requestIdOrData);
      console.log('📦 Type:', typeof requestIdOrData);
      
      // Normalize to object format
      const normalizedData = typeof requestIdOrData === 'string' 
        ? { requestId: requestIdOrData }
        : requestIdOrData;
      
      console.log('📤 Emitting:', JSON.stringify(normalizedData));
      console.log('=========================================================');
      
      this.emit('takeoverExpired', normalizedData);
    });

    // ✅ EVENT 5: Lock Released - FIXED TO HANDLE STRING
    this.connection.on('ProductLockReleased', (productIdOrData: any) => {
      console.log('🔓 ==================== LOCK RELEASED ====================');
      console.log('📦 Raw data:', productIdOrData);
      console.log('📦 Type:', typeof productIdOrData);
      
      // ✅ TRANSFORM: Backend sends string, we need object
      const normalizedData = typeof productIdOrData === 'string'
        ? { productId: productIdOrData }
        : productIdOrData;
      
      console.log('📤 Emitting:', JSON.stringify(normalizedData));
      console.log('=========================================================');
      
      this.emit('lockReleased', normalizedData);
    });

    // ✅ EVENT 6: Lock Acquired
    this.connection.on('ProductLockAcquired', (data: any) => {
      console.log('🔒 ==================== LOCK ACQUIRED ====================');
      console.log('📦 Data:', JSON.stringify(data, null, 2));
      console.log('=========================================================');
      
      this.emit('lockAcquired', data);
    });
  }

  private logErrorGuidance(error: any) {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('timeout')) {
      console.error('💡 CONNECTION TIMEOUT');
      console.error('   - Check if backend is running');
      console.error('   - Check firewall/network settings');
    } else if (message.includes('401') || message.includes('unauthorized')) {
      console.error('💡 AUTH FAILED');
      console.error('   - Token might be expired');
      console.error('   - Re-login required');
    } else if (message.includes('404')) {
      console.error('💡 HUB NOT FOUND');
      console.error('   - Check hub URL: /hubs/product-lock');
      console.error('   - Verify backend SignalR setup');
    } else if (message.includes('cors')) {
      console.error('💡 CORS ERROR');
      console.error('   - Backend CORS not configured');
      console.error('   - Check Program.cs AllowCredentials');
    } else if (message.includes('websocket')) {
      console.error('💡 WEBSOCKET FAILED');
      console.error('   - Will fallback to LongPolling');
    } else {
      console.error('💡 UNKNOWN ERROR');
      console.error('   - Check backend logs');
      console.error('   - Check browser console');
    }
  }

  // ✅ Invoke server methods
  async invoke(methodName: string, ...args: any[]): Promise<any> {
    if (!this.connection) {
      throw new Error('SignalR not connected');
    }

    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error(`Cannot invoke - state: ${this.getConnectionState()}`);
    }

    try {
      console.log(`📤 Invoking: ${methodName}`, args);
      const result = await this.connection.invoke(methodName, ...args);
      console.log(`📥 Result: ${methodName}`, result);
      return result;
    } catch (error: any) {
      console.error(`❌ Invoke failed: ${methodName}`, error.message);
      throw error;
    }
  }

  // ✅ Stop connection with cleanup
  async stopConnection() {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('🔌 SignalR disconnected');
      } catch (error) {
        console.error('Error stopping:', error);
      }
      this.connection = null;
      this.connectionPromise = null;
      this.listeners.clear();
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    }
  }

  // ✅ Add event listener
  on(
    event: 'takeoverRequest' | 'takeoverApproved' | 'takeoverRejected' | 'takeoverExpired' | 'lockReleased' | 'lockAcquired', 
    callback: (data: any) => void
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const callbacks = this.listeners.get(event)!;
    
    // Prevent duplicate listeners
    if (!callbacks.includes(callback)) {
      callbacks.push(callback);
      console.log(`📢 Listener added: ${event} (total: ${callbacks.length})`);
    } else {
      console.warn(`⚠️ Duplicate listener for: ${event}`);
    }
  }

  // ✅ Remove event listener
  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        console.log(`📢 Listener removed: ${event} (remaining: ${callbacks.length})`);
      }
    }
  }

  // ✅ Emit event to listeners
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks && callbacks.length > 0) {
      console.log(`🔔 Emitting ${event} to ${callbacks.length} listeners`);
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          console.error(`❌ Error in ${event} callback:`, error);
        }
      });
    } else {
      console.warn(`⚠️ No listeners for event: ${event}`);
    }
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  getConnectionState(): string {
    if (!this.connection) return 'Not initialized';
    return signalR.HubConnectionState[this.connection.state];
  }

  getConnectionId(): string | null {
    return this.connection?.connectionId || null;
  }

  // ✅ Get detailed status
  getStatus() {
    return {
      isConnected: this.isConnected(),
      isConnecting: this.isConnecting,
      state: this.getConnectionState(),
      connectionId: this.getConnectionId(),
      reconnectAttempts: this.reconnectAttempts,
      listenerCounts: Object.fromEntries(
        Array.from(this.listeners.entries()).map(([event, callbacks]) => [event, callbacks.length])
      ),
    };
  }

  // ✅ Test connection
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        console.error('❌ Not connected');
        return false;
      }

      console.log('🧪 Testing connection...');
      
      const status = this.getStatus();
      console.log('📊 Connection status:', {
        isConnected: status.isConnected,
        state: status.state,
        connectionId: status.connectionId
      });
      
      if (status.isConnected && status.connectionId) {
        console.log('✅ Connection test passed - SignalR is ready');
        return true;
      }
      
      console.warn('⚠️ Connection state invalid');
      return false;
      
    } catch (error: any) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
  }
}

export const signalRService = new SignalRService();
