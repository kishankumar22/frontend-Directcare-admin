// lib/services/signalRService.ts - COMPLETE REPLACEMENT
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

      // Test hub endpoint first
      console.log('🧪 Testing hub endpoint...');
      try {
        const testResponse = await fetch(`${hubUrl}/negotiate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🧪 Negotiate response:', testResponse.status, testResponse.statusText);
        
        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          console.error('❌ Negotiate failed:', errorText);
          
          if (testResponse.status === 401) {
            console.error('💡 Authentication failed - token might be invalid');
          } else if (testResponse.status === 404) {
            console.error('💡 Hub not found - check backend');
          } else if (testResponse.status === 500) {
            console.error('💡 Server error - check backend logs');
          }
          
          return false;
        } else {
          const negotiateData = await testResponse.json();
          console.log('✅ Negotiate successful:', negotiateData);
        }
      } catch (negotiateError: any) {
        console.error('❌ Negotiate error:', negotiateError.message);
        if (negotiateError.message.includes('CORS')) {
          console.error('💡 CORS issue - backend must allow:', window.location.origin);
        }
        return false;
      }

      console.log('🔨 Building connection...');

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => {
            const currentToken = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
            console.log('🔑 Token factory called');
            return currentToken || '';
          },
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
          skipNegotiation: false,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Debug) // More verbose
        .build();

      // Setup events BEFORE starting
      this.connection.on('ReceiveTakeoverRequest', (data) => {
        console.log('🔔 ==================== TAKEOVER REQUEST RECEIVED ====================');
        console.log('📦 Data:', data);
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

      this.connection.onreconnecting((error) => {
        console.warn('⚠️ Reconnecting...', error?.message);
      });

      this.connection.onreconnected((connectionId) => {
        console.log('✅ Reconnected, ID:', connectionId);
      });

      this.connection.onclose((error) => {
        console.error('❌ Connection closed:', error?.message);
      });

      console.log('🚀 Starting connection...');
      
      // Add timeout
      const startPromise = this.connection.start();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
      });

      await Promise.race([startPromise, timeoutPromise]);

      console.log('==================== ✅ CONNECTED! ====================');
      console.log('🆔 Connection ID:', this.connection.connectionId);
      console.log('📡 State:', signalR.HubConnectionState[this.connection.state]);
      console.log('====================================================');

      return true;

    } catch (error: any) {
      console.error('==================== ❌ CONNECTION ERROR ====================');
      console.error('Type:', error.constructor?.name || 'Unknown');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      
      // Specific error guidance
      if (error.message.includes('timeout')) {
        console.error('💡 Connection timeout - check if backend SignalR hub is running');
      } else if (error.message.includes('401') || error.message.includes('403')) {
        console.error('💡 Auth failed - check token validity');
      } else if (error.message.includes('negotiate')) {
        console.error('💡 Hub not found at:', `${process.env.NEXT_PUBLIC_API_URL}/hubs/productLock`);
      } else if (error.message.includes('CORS')) {
        console.error('💡 CORS - backend must allow origin:', window.location.origin);
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.error('💡 Network error - cannot reach backend');
      }
      
      console.error('============================================================');

      this.connection = null;
      return false;
    }
  }

  async stopConnection() {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('🔌 SignalR disconnected');
      } catch (error) {
        console.error('Error stopping:', error);
      }
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
