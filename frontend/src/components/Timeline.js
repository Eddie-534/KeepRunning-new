import React from "react";

export default function Timeline({ events, title = "Activity Timeline" }) {
  const formatDistance = (meters) => {
    const km = meters / 1000;
    if (km < 1) {
      return `${meters}m`;
    }
    return `${km.toFixed(2)}km`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case "RUN_RECORDED":
        return "🏃";
      case "RUN_UPDATED":
        return "✏️";
      case "SHOE_UPGRADED":
        return "👟";
      case "SHOE_MINTED":
        return "🎁";
      default:
        return "📌";
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case "RUN_RECORDED":
        return "var(--accent-primary)";
      case "RUN_UPDATED":
        return "var(--text-secondary)";
      case "SHOE_UPGRADED":
        return "var(--accent-tertiary)";
      case "SHOE_MINTED":
        return "var(--accent-secondary)";
      default:
        return "var(--text-secondary)";
    }
  };

  const getEventTitle = (event) => {
    switch (event.type) {
      case "RUN_RECORDED":
        return "Run Recorded";
      case "RUN_UPDATED":
        return "Run Updated";
      case "SHOE_UPGRADED":
        return "Shoe Upgraded";
      case "SHOE_MINTED":
        return "Shoe Minted";
      default:
        return "Unknown Event";
    }
  };

  const getEventDescription = (event) => {
    switch (event.type) {
      case "RUN_RECORDED":
        return `${event.distanceKm}km in ${event.durationMin}min`;
      case "RUN_UPDATED":
        return `Updated to ${event.newDistanceKm}km`;
      case "SHOE_UPGRADED":
        return `Level ${event.oldLevel} → ${event.newLevel}`;
      case "SHOE_MINTED":
        return `Level ${event.level}`;
      default:
        return "";
    }
  };

  const shortenAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!events || events.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
        </div>
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--text-secondary)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
          <p>No events yet</p>
          <p style={{ fontSize: "12px" }}>Submit your first run to start tracking!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <span className="badge">{events.length} events</span>
      </div>

      <div className="timeline">
        {events.map((event, index) => (
          <div
            key={index}
            className={`timeline-item ${event.type === "SHOE_UPGRADED" ? "timeline-item-upgrade" : ""}`}
          >
            <div className="timeline-content">
              <div className="timeline-header">
                <div className="timeline-icon">
                  {getEventTypeIcon(event.type)}
                </div>
                <div className="timeline-title">
                  {getEventTitle(event)}
                </div>
                <div className="timeline-time">
                  {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "Just now"}
                </div>
              </div>

              <div className="timeline-description">
                {getEventDescription(event)}
              </div>

              {/* Additional details for different event types */}
              {event.type === "RUN_RECORDED" && (
                <div className="timeline-details">
                  <div className="detail-row">
                    <span className="detail-label">Total:</span>
                    <span className="detail-value">{event.userTotalDistanceKm}km</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Runs:</span>
                    <span className="detail-value">{event.userRunCount}</span>
                  </div>
                  {event.txHash && (
                    <a
                      href={event.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-link"
                    >
                      View on Block Explorer →
                    </a>
                  )}
                </div>
              )}

              {event.type === "SHOE_UPGRADED" && (
                <div className="timeline-details">
                  <div className="detail-row">
                    <span className="detail-label">Distance:</span>
                    <span className="detail-value">{event.totalDistance}km</span>
                  </div>
                  {event.tokenId && (
                    <div className="detail-row">
                      <span className="detail-label">Token:</span>
                      <span className="detail-value">#{event.tokenId}</span>
                    </div>
                  )}
                  {event.txHash && (
                    <a
                      href={event.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-link"
                    >
                      View on Block Explorer →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
