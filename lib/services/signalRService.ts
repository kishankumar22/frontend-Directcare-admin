// lib/services/signalRService.ts
import * as signalR from '@microsoft/signalr';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private listeners: Map<string, Function[]> = new Map();

  async startConnection(userId: string): Promise<boolean> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('✅ Already connected');
      return true;
    }

    try {
      console.log('==================== SIGNALR START ====================');
      
      // Get config
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';
      const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
      
      console.log('📍 API:', apiUrl);
      console.log('🔑 Token:', token ? `${token.substring(0, 20)}...` : '❌ Missing');
      console.log('👤 User:', userId);

      if (!token) {
        console.error('❌ No token');
        return false;
      }

      const hubUrl = `${apiUrl}/hubs/productLock`;
      console.log('🔗 Hub:', hubUrl);

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => localStorage.getItem('authToken') || localStorage.getItem('accessToken') || '',
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Setup events BEFORE starting
      this.connection.on('ReceiveTakeoverRequest', (data) => {
        console.log('🔔 TAKEOVER REQUEST RECEIVED:', data);
        this.emit('takeoverRequest', data);
      });

      this.connection.on('TakeoverRequestApproved', (data) => {
        console.log('✅ TAKEOVER APPROVED:', data);
        this.emit('takeoverApproved', data);
      });

      this.connection.on('TakeoverRequestRejected', (data) => {
        console.log('❌ TAKEOVER REJECTED:', data);
        this.emit('takeoverRejected', data);
      });

      this.connection.onreconnecting(() => console.warn('⚠️ Reconnecting...'));
      this.connection.onreconnected((id) => console.log('✅ Reconnected:', id));
      this.connection.onclose((err) => console.error('❌ Closed:', err));

      // Start
      await this.connection.start();

      console.log('✅ CONNECTED!');
      console.log('🆔 ID:', this.connection.connectionId);
      console.log('===================================================');

      return true;

    } catch (error: any) {
      console.error('==================== ERROR ====================');
      console.error('Type:', error.constructor.name);
      console.error('Message:', error.message);
      
      if (error.message.includes('401') || error.message.includes('403')) {
        console.error('💡 Auth failed - check token');
      } else if (error.message.includes('negotiate')) {
        console.error('💡 Hub not found - check backend');
      } else if (error.message.includes('CORS')) {
        console.error('💡 CORS issue - check backend CORS config');
      }
      
      console.error('================================================');
      this.connection = null;
      return false;
    }
  }

  async stopConnection() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.listeners.clear();
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
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
}

export const signalRService = new SignalRService();
