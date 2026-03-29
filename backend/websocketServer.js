const WebSocket = require("ws");
const { ethers } = require("ethers");

const WS_PORT = process.env.WS_PORT || 3002;

/**
 * Start WebSocket server
 * @returns {WebSocketServer} WebSocket server instance
 */
function startWebSocketServer() {
  const wss = new WebSocket.Server({ port: WS_PORT });

  wss.on("listening", () => {
    console.log(`WebSocket server is listening on port ${WS_PORT}`);
  });

  wss.on("connection", (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    console.log(`\nNew WebSocket client connected: ${clientIP}`);

    // Send welcome message
    const welcomeMessage = {
      type: "CONNECTED",
      data: {
        message: "Connected to Keep Running backend",
        timestamp: Date.now(),
        serverTime: new Date().toISOString()
      }
    };
    ws.send(JSON.stringify(welcomeMessage));

    // Handle incoming messages
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(ws, data);
      } catch (error) {
        console.error("Error parsing client message:", error.message);
        sendError(ws, "Invalid message format");
      }
    });

    // Handle client disconnect
    ws.on("close", () => {
      console.log(`WebSocket client disconnected: ${clientIP}`);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`WebSocket error for ${clientIP}:`, error.message);
    });

    // Send current stats on connection
    sendInitialData(ws);
  });

  return wss;
}

/**
 * Handle incoming client messages
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} data - Parsed message data
 */
async function handleClientMessage(ws, data) {
  const { type, payload } = data;

  switch (type) {
    case "PING":
      handlePing(ws);
      break;

    case "SUBSCRIBE_USER":
      handleSubscribeUser(ws, payload);
      break;

    case "REQUEST_STATS":
      await handleRequestStats(ws);
      break;

    case "REQUEST_USER_DATA":
      await handleRequestUserData(ws, payload);
      break;

    default:
      console.log("Unknown message type:", type);
      sendError(ws, "Unknown message type");
  }
}

/**
 * Handle ping from client
 * @param {WebSocket} ws - WebSocket connection
 */
function handlePing(ws) {
  const response = {
    type: "PONG",
    data: {
      timestamp: Date.now()
    }
  };
  ws.send(JSON.stringify(response));
}

/**
 * Handle user subscription (for filtering events)
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - Subscription payload
 */
function handleSubscribeUser(ws, payload) {
  const { userAddress } = payload;

  if (!userAddress || !ethers.utils.isAddress(userAddress)) {
    sendError(ws, "Invalid user address");
    return;
  }

  // Store subscription in connection metadata
  ws.subscribedUser = userAddress;

  const response = {
    type: "SUBSCRIBED",
    data: {
      userAddress,
      timestamp: Date.now()
    }
  };
  ws.send(JSON.stringify(response));
  console.log(`Client subscribed to user: ${userAddress}`);
}

/**
 * Handle request for statistics
 * @param {WebSocket} ws - WebSocket connection
 */
async function handleRequestStats(ws) {
  try {
    const { queryStatistics } = require("./eventListeners");
    const stats = await queryStatistics();

    const response = {
      type: "STATS_RESPONSE",
      data: stats
    };
    ws.send(JSON.stringify(response));
  } catch (error) {
    console.error("Error fetching statistics:", error.message);
    sendError(ws, "Failed to fetch statistics");
  }
}

/**
 * Handle request for user data
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - Request payload
 */
async function handleRequestUserData(ws, payload) {
  const { userAddress } = payload;

  if (!userAddress || !ethers.utils.isAddress(userAddress)) {
    sendError(ws, "Invalid user address");
    return;
  }

  try {
    const { queryUserData } = require("./eventListeners");
    const userData = await queryUserData(userAddress);

    const response = {
      type: "USER_DATA_RESPONSE",
      data: userData
    };
    ws.send(JSON.stringify(response));
  } catch (error) {
    console.error("Error fetching user data:", error.message);
    sendError(ws, "Failed to fetch user data");
  }
}

/**
 * Send initial data to newly connected client
 * @param {WebSocket} ws - WebSocket connection
 */
async function sendInitialData(ws) {
  try {
    const { queryStatistics } = require("./eventListeners");
    const stats = await queryStatistics();

    const message = {
      type: "INITIAL_DATA",
      data: {
        stats,
        timestamp: Date.now()
      }
    };
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error("Error sending initial data:", error.message);
  }
}

/**
 * Send error message to client
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} errorMessage - Error message
 */
function sendError(ws, errorMessage) {
  const response = {
    type: "ERROR",
    data: {
      message: errorMessage,
      timestamp: Date.now()
    }
  };
  ws.send(JSON.stringify(response));
}

/**
 * Broadcast event to all connected clients
 * @param {WebSocketServer} wss - WebSocket server
 * @param {Object} event - Event data
 */
function broadcastToAll(wss, event) {
  const message = JSON.stringify(event);
  let sentCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
        sentCount++;
      } catch (error) {
        console.error("Error broadcasting to client:", error.message);
      }
    }
  });

  console.log(`Broadcasted event to ${sentCount}/${wss.clients.size} client(s)`);
}

module.exports = {
  startWebSocketServer,
  broadcastToAll,
  sendError
};
