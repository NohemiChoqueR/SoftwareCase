/**
 * Servicio de conexión WebSocket para sincronización colaborativa en tiempo real.
 */

export interface DiagramMutationEvent {
  action: string;
  payload: any;
  version: number;
  sender_id?: number | null;
  sender_email?: string;
}

export interface PresenceUser {
  id: number;
  email: string;
  nombre?: string;
}

export interface PresenceEvent {
  event: 'user_joined' | 'user_left';
  user: PresenceUser;
}

export class DiagramSocketService {
  private ws: WebSocket | null = null;
  private diagramId: string;
  private token: string;
  private reconnectTimer: number | null = null;
  private isDestroyed = false;
  private pingInterval: number | null = null;

  public onMutation?: (event: DiagramMutationEvent) => void;
  public onPresence?: (event: PresenceEvent) => void;
  public onStatusChange?: (connected: boolean) => void;

  constructor(diagramId: string, token: string) {
    this.diagramId = diagramId;
    this.token = token;
  }

  public connect(): void {
    if (this.isDestroyed || !this.token) return;

    try {
      const envWsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const host = window.location.host;
      const baseWs = envWsUrl ? envWsUrl.replace(/\/$/, '') : `${wsProtocol}//${host}`;
      const url = `${baseWs}/ws/diagramas/${this.diagramId}/?token=${encodeURIComponent(this.token)}`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.onStatusChange?.(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'diagram_mutation') {
            this.onMutation?.({
              action: data.action,
              payload: data.payload,
              version: data.version,
              sender_id: data.sender_id,
              sender_email: data.sender_email,
            });
          } else if (data.type === 'presence_event') {
            this.onPresence?.({
              event: data.event,
              user: data.user,
            });
          }
        } catch (err) {
          console.error('[DiagramSocket] Error parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        this.onStatusChange?.(false);
        this.stopHeartbeat();
        if (!this.isDestroyed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[DiagramSocket] WebSocket error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.error('[DiagramSocket] Failed to initiate connection:', e);
      this.scheduleReconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  public disconnect(): void {
    this.isDestroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
