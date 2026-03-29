import React, { useState, useEffect, useCallback } from "react";
import WalletConnect from "./components/WalletConnect";
import RunForm from "./components/RunForm";
import ShoeDisplay from "./components/ShoeDisplay";
import ProgressBar from "./components/ProgressBar";
import Timeline from "./components/Timeline";
import { wsClient } from "./utils/websocketClient";
import { calculateLevel, contractConfig } from "./utils/contractConfig";

export default function App() {
  const [account, setAccount] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [level, setLevel] = useState(0);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Set up WebSocket event listeners
    wsClient.on("SERVER_CONNECTED", handleServerConnected);
    wsClient.on("CONNECTED", () => setWsConnected(true));
    wsClient.on("DISCONNECTED", () => setWsConnected(false));
    wsClient.on("RUN_RECORDED", handleRunRecorded);
    wsClient.on("SHOE_UPGRADED", handleShoeUpgraded);
    wsClient.on("STATS", handleStats);
    wsClient.on("ERROR", handleError);

    return () => {
      wsClient.off("SERVER_CONNECTED", handleServerConnected);
      wsClient.off("CONNECTED", () => setWsConnected(true));
      wsClient.off("DISCONNECTED", () => setWsConnected(false));
      wsClient.off("RUN_RECORDED", handleRunRecorded);
      wsClient.off("SHOE_UPGRADED", handleShoeUpgraded);
      wsClient.off("STATS", handleStats);
      wsClient.off("ERROR", handleError);
    };
  }, [account]);

  const handleServerConnected = (data) => {
    console.log("Connected to backend server:", data);
    // Request initial stats
    wsClient.requestStats();
    // Subscribe to user events if wallet is connected
    if (account) {
      wsClient.subscribeToUser(account);
    }
  };

  const handleRunRecorded = useCallback((data) => {
    console.log("Run recorded:", data);

    // Update total distance if it's our run
    if (data.user.toLowerCase() === account?.toLowerCase()) {
      setTotalDistance(parseFloat(data.userTotalDistanceKm));
      setLevel(calculateLevel(parseFloat(data.userTotalDistanceKm)));
    }

    // Add to timeline
    setEvents(prev => [
      { ...data, type: "RUN_RECORDED", timestamp: Date.now() },
      ...prev
    ].slice(0, 50)); // Keep last 50 events
  }, [account]);

  const handleShoeUpgraded = useCallback((data) => {
    console.log("Shoe upgraded:", data);

    // Update level if it's our upgrade
    if (data.user.toLowerCase() === account?.toLowerCase()) {
      setLevel(parseInt(data.newLevel));
      setTotalDistance(parseFloat(data.totalDistance));
    }

    // Add to timeline
    setEvents(prev => [
      { ...data, type: "SHOE_UPGRADED", timestamp: Date.now() },
      ...prev
    ].slice(0, 50));
  }, [account]);

  const handleStats = (data) => {
    console.log("Stats received:", data);
    setStats(data);
  };

  const handleError = (error) => {
    console.error("WebSocket error:", error);
  };

  const handleWalletConnect = (connectedAccount) => {
    setAccount(connectedAccount);
    wsClient.subscribeToUser(connectedAccount);
    wsClient.requestUserData(connectedAccount);
  };

  const handleWalletDisconnect = () => {
    setAccount(null);
    setTotalDistance(0);
    setLevel(0);
  };

  const handleRunSubmitted = (data) => {
    console.log("Run submitted:", data);
    // The backend will notify us via WebSocket when the transaction is confirmed
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <span className="logo-icon">🏃</span>
              <h1>Keep Running</h1>
            </div>
            <div className="header-actions">
              <div className="connection-status">
                <span className={`status-dot ${wsConnected ? "connected" : "disconnected"}`}></span>
                <span className="status-text">
                  {wsConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <WalletConnect
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        <div className="app-content">
          {/* Left Column - User Info */}
          <div className="left-column">
            <ShoeDisplay account={account} />
            {level > 0 && (
              <ProgressBar
                currentLevel={level}
                totalDistance={totalDistance}
              />
            )}
          </div>

          {/* Right Column - Actions and Timeline */}
          <div className="right-column">
            <RunForm
              account={account}
              onRunSubmitted={handleRunSubmitted}
            />

            {/* Global Stats */}
            {stats && (
              <div className="card" style={{ marginTop: "20px" }}>
                <div className="card-header">
                  <h3 className="card-title">Global Statistics</h3>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{stats.totalDistanceKm}</div>
                    <div className="stat-label">Total Distance (km)</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.totalRuns}</div>
                    <div className="stat-label">Total Runs</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.totalUsers}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.totalRecords}</div>
                    <div className="stat-label">Total Records</div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div style={{ marginTop: "20px" }}>
              <Timeline
                events={events}
                title={account ? "Your Activity Timeline" : "Recent Activity"}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container">
          <div className="footer-content">
            <p>Keep Running - Decentralized Running App</p>
            <div className="footer-links">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="https://docs.keeprunning.io" target="_blank" rel="noopener noreferrer">
                Docs
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .App {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-header {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          padding: 16px 0;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          font-size: 28px;
        }

        .logo h1 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-muted);
        }

        .status-dot.connected {
          background: #3fb950;
          box-shadow: 0 0 8px #3fb950;
        }

        .status-dot.disconnected {
          background: var(--accent-danger);
          box-shadow: 0 0 8px var(--accent-danger);
        }

        .wallet-connected {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .address {
          font-size: 14px;
          color: var(--text-primary);
        }

        .main {
          flex: 1;
          padding-top: 24px;
          padding-bottom: 24px;
        }

        .app-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 900px) {
          .app-content {
            grid-template-columns: 1fr;
          }
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .right-column {
          display: flex;
          flex-direction: column;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .stat-item {
          background: var(--bg-tertiary);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--accent-primary);
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .app-footer {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          padding: 20px 0;
          margin-top: auto;
        }

        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .footer-links {
          display: flex;
          gap: 16px;
        }

        .footer-links a {
          color: var(--accent-primary);
          text-decoration: none;
        }

        .footer-links a:hover {
          text-decoration: underline;
        }

        /* Transaction Status Styles */
        .tx-status {
          padding: 12px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tx-pending {
          background: rgba(88, 166, 255, 0.1);
          border: 1px solid var(--accent-primary);
        }

        .tx-success {
          background: rgba(35, 134, 54, 0.1);
          border: 1px solid var(--accent-secondary);
        }

        .tx-error {
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid var(--accent-danger);
        }

        .tx-message {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .tx-link {
          font-size: 12px;
          color: var(--accent-primary);
          text-decoration: none;
          align-self: flex-start;
        }

        .tx-link:hover {
          text-decoration: underline;
        }

        .tx-error-message {
          font-size: 12px;
          color: var(--accent-danger);
        }
      `}</style>
    </div>
  );
}
