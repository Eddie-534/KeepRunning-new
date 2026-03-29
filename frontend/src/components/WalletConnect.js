import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

export default function WalletConnect({ onConnect, onDisconnect }) {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    // Check if wallet is already connected
    checkConnection();
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        // ethers v5 syntax
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const network = await provider.getNetwork();
          setChainId(network.chainId);
          if (onConnect) onConnect(accounts[0]);
        }
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAccount(accounts[0]);
      if (onConnect) onConnect(accounts[0]);
    }
  };

  const connect = async () => {
    setIsConnecting(true);
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask to use this app");
        setIsConnecting(false);
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      // ethers v5 syntax
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(network.chainId);

      // Switch to Sepolia if not already
      if (network.chainId !== 11155111) {
        await switchToSepolia();
      }

      setAccount(accounts[0]);
      if (onConnect) onConnect(accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert(error.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }]
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: "Sepolia Testnet",
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "ETH",
                  decimals: 18
                },
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"]
              }
            ]
          });
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError);
        }
      }
    }
  };

  const disconnect = () => {
    setAccount(null);
    setChainId(null);
    if (onDisconnect) onDisconnect();
  };

  const shortenAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isCorrectNetwork = chainId === 11155111;

  return (
    <div className="wallet-connect">
      {!account ? (
        <button
          className="btn btn-primary"
          onClick={connect}
          disabled={isConnecting}
        >
          {isConnecting ? <span className="spinner"></span> : "Connect Wallet"}
        </button>
      ) : (
        <div className="wallet-connected">
          <div className="wallet-info">
            <span className="address">{shortenAddress(account)}</span>
            {!isCorrectNetwork && (
              <span className="badge badge-warning">Wrong Network</span>
            )}
            {isCorrectNetwork && (
              <span className="badge badge-success">Sepolia</span>
            )}
          </div>
          <button className="btn btn-tertiary" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
