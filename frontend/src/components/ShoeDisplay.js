import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractConfig } from "../utils/contractConfig";

const LEVEL_CONFIG = {
  0: { name: "No Shoe", description: "Connect wallet to get your first shoe", color: "#6a737d" },
  1: { name: "Base Runner", description: "The beginning of your running journey", color: "#6a737d" },
  2: { name: "Bronze Warrior", description: "50 km conquered - Bronze status achieved", color: "#cd7f32" },
  3: { name: "Silver Knight", description: "150 km conquered - Silver status achieved", color: "#c0c0c0" },
  4: { name: "Golden Champion", description: "300 km conquered - Golden status achieved", color: "#ffd700" },
  5: { name: "Rainbow Legend", description: "500 km conquered - Legendary status achieved", color: "rainbow" }
};

export default function ShoeDisplay({ account, onUpdate }) {
  const [level, setLevel] = useState(0);
  const [totalDistance, setTotalDistance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [shoeInfo, setShoeInfo] = useState(null);

  useEffect(() => {
    if (account) {
      fetchUserData();
    } else {
      setLevel(0);
      setTotalDistance("0");
      setShoeInfo(null);
      setLoading(false);
    }
  }, [account]);

  const fetchUserData = async () => {
    if (!account) return;

    setLoading(true);
    try {
      // Note: In a real app, you would query both chains
      // For now, we'll use the local state from events
      // In production, use an API to aggregate data from both chains

      // ethers v5 syntax
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Query Sepolia for total distance
      const runOriginContract = new ethers.Contract(
        contractConfig.sepolia.shoeRunOrigin,
        contractConfig.sepolia.abi,
        provider
      );

      const distanceMeters = await runOriginContract.getUserTotalDistanceMeters(account);
      const distanceKm = (Number(distanceMeters) / 1000).toFixed(2);
      setTotalDistance(distanceKm);

      // Query Lasna for shoe level
      // Note: This requires switching chains or using a multi-chain provider
      // For demo purposes, we'll calculate level based on distance
      const calculatedLevel = calculateLevel(parseFloat(distanceKm));
      setLevel(calculatedLevel);

      setShoeInfo({
        level: calculatedLevel,
        name: LEVEL_CONFIG[calculatedLevel].name,
        color: LEVEL_CONFIG[calculatedLevel].color
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setLoading(false);
    }
  };

  const calculateLevel = (distanceKm) => {
    if (distanceKm >= 500) return 5;
    if (distanceKm >= 300) return 4;
    if (distanceKm >= 150) return 3;
    if (distanceKm >= 50) return 2;
    if (distanceKm >= 0) return 1;
    return 0;
  };

  const getProgressInfo = () => {
    const distance = parseFloat(totalDistance);
    const currentLevel = level;

    if (currentLevel >= 5) return { progress: 100, nextLevelDistance: 0 };

    const thresholds = [0, 50, 150, 300, 500];
    const currentThreshold = thresholds[currentLevel - 1] || 0;
    const nextThreshold = thresholds[currentLevel] || 500;

    const distanceInLevel = distance - currentThreshold;
    const distanceForLevel = nextThreshold - currentThreshold;
    const progress = Math.min(100, Math.max(0, (distanceInLevel / distanceForLevel) * 100));

    return {
      progress,
      nextLevelDistance: nextThreshold - distance
    };
  };

  const { progress, nextLevelDistance } = getProgressInfo();

  const getShoeSvg = (lvl) => {
    const color = LEVEL_CONFIG[lvl].color;

    if (lvl === 0 || lvl === 1) {
      // Base shoe - gray/white
      return (
        <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 50 L25 40 L40 45 L60 42 L80 48 L90 55 L85 70 L15 70 Z" fill={color} stroke="#8b949e" strokeWidth="2"/>
          <circle cx="25" cy="45" r="5" fill="#0d1117"/>
          <circle cx="40" cy="45" r="4" fill="#0d1117"/>
          <circle cx="60" cy="42" r="4" fill="#0d1117"/>
          <circle cx="80" cy="48" r="3" fill="#0d1117"/>
          <path d="M50 20 L55 40 L45 40 Z" fill="#6e7681"/>
        </svg>
      );
    }

    if (lvl === 2) {
      // Bronze shoe
      return (
        <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cd7f32" />
              <stop offset="50%" stopColor="#b87333" />
              <stop offset="100%" stopColor="#cd7f32" />
            </linearGradient>
          </defs>
          <path d="M10 50 L25 38 L40 43 L60 40 L80 46 L90 53 L85 70 L15 70 Z" fill="url(#bronzeGrad)" stroke="#8b4513" strokeWidth="2"/>
          <circle cx="25" cy="43" r="6" fill="#0d1117"/>
          <circle cx="40" cy="43" r="5" fill="#0d1117"/>
          <circle cx="60" cy="40" r="5" fill="#0d1117"/>
          <circle cx="80" cy="46" r="4" fill="#0d1117"/>
          <path d="M50 15 L57 38 L43 38 Z" fill="#b87333"/>
          <path d="M50 15 L55 38 L45 38 Z" fill="#cd7f32"/>
        </svg>
      );
    }

    if (lvl === 3) {
      // Silver shoe
      return (
        <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8e8e8" />
              <stop offset="50%" stopColor="#c0c0c0" />
              <stop offset="100%" stopColor="#a8a8a8" />
            </linearGradient>
          </defs>
          <path d="M10 50 L25 36 L40 41 L60 38 L80 44 L90 51 L85 70 L15 70 Z" fill="url(#silverGrad)" stroke="#808080" strokeWidth="2"/>
          <circle cx="25" cy="41" r="6" fill="#0d1117"/>
          <circle cx="40" cy="41" r="5" fill="#0d1117"/>
          <circle cx="60" cy="38" r="5" fill="#0d1117"/>
          <circle cx="80" cy="44" r="4" fill="#0d1117"/>
          <path d="M50 12 L58 36 L42 36 Z" fill="#a8a8a8"/>
          <path d="M50 12 L56 36 L44 36 Z" fill="#c0c0c0"/>
        </svg>
      );
    }

    if (lvl === 4) {
      // Gold shoe
      return (
        <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="50%" stopColor="#ffec8b" />
              <stop offset="100%" stopColor="#daa520" />
            </linearGradient>
          </defs>
          <path d="M10 50 L25 34 L40 39 L60 36 L80 42 L90 49 L85 70 L15 70 Z" fill="url(#goldGrad)" stroke="#b8860b" strokeWidth="2"/>
          <circle cx="25" cy="39" r="6" fill="#0d1117"/>
          <circle cx="40" cy="39" r="5" fill="#0d1117"/>
          <circle cx="60" cy="36" r="5" fill="#0d1117"/>
          <circle cx="80" cy="42" r="4" fill="#0d1117"/>
          <path d="M50 10 L59 34 L41 34 Z" fill="#daa520"/>
          <path d="M50 10 L57 34 L43 34 Z" fill="#ffd700"/>
        </svg>
      );
    }

    if (lvl === 5) {
      // Rainbow shoe
      return (
        <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b6b" />
              <stop offset="20%" stopColor="#feca57" />
              <stop offset="40%" stopColor="#48dbfb" />
              <stop offset="60%" stopColor="#ff9ff3" />
              <stop offset="80%" stopColor="#54a0ff" />
              <stop offset="100%" stopColor="#5f27cd" />
            </linearGradient>
          </defs>
          <path d="M10 50 L25 32 L40 37 L60 34 L80 40 L90 47 L85 70 L15 70 Z" fill="url(#rainbowGrad)" stroke="#fff" strokeWidth="2"/>
          <circle cx="25" cy="37" r="6" fill="#0d1117"/>
          <circle cx="40" cy="37" r="5" fill="#0d1117"/>
          <circle cx="60" cy="34" r="5" fill="#0d1117"/>
          <circle cx="80" cy="40" r="4" fill="#0d1117"/>
          <path d="M50 8 L60 32 L40 32 Z" fill="url(#rainbowGrad)"/>
          <path d="M50 8 L58 32 L42 32 Z" fill="#ff6b6b"/>
        </svg>
      );
    }
  };

  if (!account) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>👟</div>
        <h3>Connect Your Wallet</h3>
        <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
          Connect your wallet to view your running shoes
        </p>
      </div>
    );
  }

  return (
    <div className="card fade-in">
      <div className="card-header">
        <h3 className="card-title">Your Running Shoe</h3>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="shoe-display">
          {/* Shoe Icon */}
          <div className="shoe-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            {getShoeSvg(level)}
          </div>

          {/* Level Info */}
          <div className="shoe-info" style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>
              {LEVEL_CONFIG[level].name}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {LEVEL_CONFIG[level].description}
            </p>
          </div>

          {/* Stats */}
          <div className="shoe-stats" style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
            marginBottom: "20px"
          }}>
            <div className="stat-box" style={{
              background: "var(--bg-tertiary)",
              padding: "16px",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                Total Distance
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--accent-primary)" }}>
                {totalDistance} <span style={{ fontSize: "14px" }}>km</span>
              </div>
            </div>
            <div className="stat-box" style={{
              background: "var(--bg-tertiary)",
              padding: "16px",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                Level
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: LEVEL_CONFIG[level].color }}>
                {level}/5
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {level < 5 && (
            <div className="progress-section" style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Next Level: {LEVEL_CONFIG[level + 1].name}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress}%`,
                    background: level === 4 ? "var(--level-5)" : LEVEL_CONFIG[level].color
                  }}
                ></div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", textAlign: "center" }}>
                {nextLevelDistance.toFixed(1)} km more to next level
              </div>
            </div>
          )}

          {level === 5 && (
            <div style={{
              background: "rgba(255, 215, 0, 0.1)",
              border: "1px solid var(--level-4)",
              borderRadius: "8px",
              padding: "16px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--level-4)", marginBottom: "4px" }}>
                🏆 MAX LEVEL
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                You've achieved legendary status!
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
