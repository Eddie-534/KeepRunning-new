import { contractConfig } from "./contractConfig";

export class WebSocketClient {
  constructor(url = contractConfig.ws.url) {
    this.url = url;
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = contractConfig.ws.maxReconnectAttempts;
    this.reconnectInterval = contractConfig.ws.reconnectInterval;
    this.isConnected = false;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit("CONNECTED", { timestamp: Date.now() });

        // Send ping to keep connection alive
        this.pingInterval = setInterval(() => {
          this.send({ type: "PING" });
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.isConnected = false;
        this.emit("DISCONNECTED", { timestamp: Date.now() });

        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.emit("ERROR", { error });
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
    }
  }

  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case "CONNECTED":
        console.log("Server connection confirmed:", data.data);
        this.emit("SERVER_CONNECTED", data.data);
        break;

      case "PONG":
        // Ping response
        break;

      case "RUN_RECORDED":
        console.log("Run recorded event:", data.data);
        this.emit("RUN_RECORDED", data.data);
        break;

      case "RUN_UPDATED":
        console.log("Run updated event:", data.data);
        this.emit("RUN_UPDATED", data.data);
        break;

      case "SHOE_UPGRADED":
        console.log("Shoe upgraded event:", data.data);
        this.emit("SHOE_UPGRADED", data.data);
        break;

      case "SHOE_MINTED":
        console.log("Shoe minted event:", data.data);
        this.emit("SHOE_MINTED", data.data);
        break;

      case "STATS_RESPONSE":
        console.log("Stats received:", data.data);
        this.emit("STATS", data.data);
        break;

      case "USER_DATA_RESPONSE":
        console.log("User data received:", data.data);
        this.emit("USER_DATA", data.data);
        break;

      case "ERROR":
        console.error("Server error:", data.data);
        this.emit("SERVER_ERROR", data.data);
        break;

      default:
        console.log("Unknown message type:", type);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }

  subscribeToUser(userAddress) {
    this.send({
      type: "SUBSCRIBE_USER",
      payload: { userAddress }
    });
  }

  requestStats() {
    this.send({
      type: "REQUEST_STATS"
    });
  }

  requestUserData(userAddress) {
    this.send({
      type: "REQUEST_USER_DATA",
      payload: { userAddress }
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.listeners.clear();
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

// Auto-connect on import
if (typeof window !== "undefined") {
  wsClient.connect();
}
