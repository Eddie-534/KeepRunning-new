import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { contractConfig } from "../utils/contractConfig";

export default function RunForm({ account, onRunSubmitted }) {
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState(null); // 'pending', 'confirmed', 'failed'
  const [txHash, setTxHash] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    const distanceValue = parseFloat(distance);
    const durationValue = parseInt(duration);

    if (!distanceValue || distanceValue <= 0) {
      alert("Please enter a valid distance");
      return;
    }

    if (!durationValue || durationValue <= 0) {
      alert("Please enter a valid duration");
      return;
    }

    // Convert distance to meters
    const distanceInMeters = Math.floor(distanceValue * 1000);
    // Convert duration to seconds
    const durationInSeconds = durationValue * 60;

    setIsSubmitting(true);
    setTxStatus("pending");
    setTxHash(null);
    setErrorMessage("");

    try {
      // ethers v5 syntax
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        contractConfig.sepolia.shoeRunOrigin,
        contractConfig.sepolia.abi,
        signer
      );

      const tx = await contract.recordRun(distanceInMeters, durationInSeconds);
      setTxHash(tx.hash);

      console.log("Transaction submitted:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log("Transaction confirmed:", receipt);
      setTxStatus("confirmed");

      if (onRunSubmitted) {
        onRunSubmitted({
          distance: distanceInMeters,
          duration: durationInSeconds,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber
        });
      }

      // Reset form
      setDistance("");
      setDuration("");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setTxStatus(null);
        setTxHash(null);
      }, 3000);

    } catch (error) {
      console.error("Error submitting run:", error);
      setTxStatus("failed");
      setErrorMessage(error.message || "Failed to submit run");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card fade-in">
      <div className="card-header">
        <h3 className="card-title">Record Your Run</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Distance (km)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              className="input"
              placeholder="e.g., 5.5"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              disabled={isSubmitting || !account}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="600"
              className="input"
              placeholder="e.g., 30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isSubmitting || !account}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || !account}
          style={{ width: "100%" }}
        >
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Submitting...
            </>
          ) : (
            "Submit Run Record"
          )}
        </button>
      </form>

      {/* Transaction Status */}
      {txStatus === "pending" && txHash && (
        <div className="tx-status tx-pending fade-in" style={{ marginTop: "16px" }}>
          <div className="tx-message">
            <span className="spinner"></span>
            Transaction pending...
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-link"
          >
            View on Etherscan
          </a>
        </div>
      )}

      {txStatus === "confirmed" && txHash && (
        <div className="tx-status tx-success fade-in" style={{ marginTop: "16px" }}>
          <div className="tx-message">
            ✓ Run recorded successfully!
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-link"
          >
            View on Etherscan
          </a>
        </div>
      )}

      {txStatus === "failed" && (
        <div className="tx-status tx-error fade-in" style={{ marginTop: "16px" }}>
          <div className="tx-message">
            ✗ Failed to submit run
          </div>
          {errorMessage && <div className="tx-error-message">{errorMessage}</div>}
        </div>
      )}

      {/* Account not connected warning */}
      {!account && (
        <div className="connect-warning" style={{ marginTop: "16px", padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px", textAlign: "center" }}>
          Please connect your wallet to submit runs
        </div>
      )}
    </div>
  );
}
