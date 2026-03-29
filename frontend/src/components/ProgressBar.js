import React from "react";

const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500];
const LEVEL_NAMES = ["", "Base", "Bronze", "Silver", "Gold", "Rainbow"];

export default function ProgressBar({ currentLevel, totalDistance }) {
  if (currentLevel >= 5) {
    return (
      <div className="progress-bar-container">
        <div className="progress-message max-level">
          <span className="trophy-icon">🏆</span>
          <span>Maximum Level Reached!</span>
        </div>
      </div>
    );
  }

  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel];
  const distanceInLevel = totalDistance - currentThreshold;
  const distanceForLevel = nextThreshold - currentThreshold;
  const progress = Math.min(100, Math.max(0, (distanceInLevel / distanceForLevel) * 100));
  const remaining = Math.max(0, nextThreshold - totalDistance);

  return (
    <div className="progress-bar-container">
      <div className="progress-header">
        <div className="progress-label">
          Level {currentLevel} → Level {currentLevel + 1}
        </div>
        <div className="progress-value">{progress.toFixed(0)}%</div>
      </div>

      <div className="progress-bar-outer">
        <div
          className="progress-bar-inner"
          style={{ width: `${progress}%` }}
        >
          <div className="progress-bar-glow"></div>
        </div>
      </div>

      <div className="progress-info">
        <div className="progress-info-item">
          <span className="label">Current:</span>
          <span className="value">{totalDistance.toFixed(1)} km</span>
        </div>
        <div className="progress-info-item">
          <span className="label">Next Level:</span>
          <span className="value">{nextThreshold} km</span>
        </div>
      </div>

      {remaining > 0 && (
        <div className="progress-remaining">
          <span className="remaining-text">
            {remaining.toFixed(1)} km more to reach {LEVEL_NAMES[currentLevel + 1]}
          </span>
        </div>
      )}

      {/* Level indicators */}
      <div className="level-indicators">
        {LEVEL_NAMES.slice(1).map((name, index) => (
          <div
            key={index}
            className={`level-indicator ${index + 1 <= currentLevel ? "completed" : ""} ${index + 1 === currentLevel + 1 ? "current" : ""}`}
            style={{
              width: `${100 / 5}%`,
              opacity: index + 1 > currentLevel + 1 ? 0.3 : 1
            }}
          >
            <div className="level-dot"></div>
            <div className="level-name">{name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
