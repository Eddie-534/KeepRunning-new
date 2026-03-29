// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./lib/reactive-lib/interfaces/IReactive.sol";
import "./lib/reactive-lib/abstract-base/AbstractReactive.sol";
import "./lib/reactive-lib/interfaces/ISystemContract.sol";

interface IShoeNFT {
    function upgradeShoe(address user, uint256 totalDistance) external returns (uint256);
    function getUserShoeLevel(address user) external view returns (uint256);
    function getUserShoeInfo(address user) external view returns (uint256 tokenId, uint256 level, uint256 mintedAt);
}

interface IShoeRunOrigin {
    function getUserTotalDistance(address user) external view returns (uint256);
}

contract ShoeReactive is IReactive, AbstractReactive {
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint64 private constant GAS_LIMIT = 1000000;

    uint256 public originChainId;
    bytes32 public constant RUN_RECORDED_TOPIC0 = keccak256("RunRecorded(address,uint256,uint256,uint256,uint256)");

    IShoeNFT public shoeNFT;
    IShoeRunOrigin public shoeRunOrigin;

    // ========== Event Definitions ==========

    event ReactiveEventReceived(
        address indexed user,
        uint256 distanceMeters,
        uint256 duration,
        uint256 timestamp,
        uint256 recordId
    );

    event LogParsingAttempt(
        address indexed user,
        uint256 topic1,
        uint256 topic2,
        uint256 dataLength
    );

    event UserLevelChecked(
        address indexed user,
        uint256 currentLevel,
        uint256 tokenId
    );

    event DistanceCalculated(
        address indexed user,
        uint256 distanceMeters,
        uint256 totalDistanceKmX10
    );

    event UpgradeAttempt(
        address indexed user,
        uint256 totalDistance,
        uint256 currentLevel
    );

    event UpgradeSuccess(
        address indexed user,
        uint256 totalDistance,
        uint256 newLevel,
        uint256 oldLevel
    );

    event UpgradeFailedString(
        address indexed user,
        uint256 totalDistance,
        string errorMessage
    );

    event UpgradeFailedBytes(
        address indexed user,
        uint256 totalDistance,
        bytes errorBytes
    );

    event UpgradeSkipped(
        address indexed user,
        uint256 totalDistance,
        string reason
    );

    event DebugString(
        address indexed user,
        string phase,
        string message
    );

    event DebugUint(
        address indexed user,
        string phase,
        uint256 value
    );

    event DebugAddress(
        address indexed user,
        string phase,
        address addr
    );

    // ========== Constructor ==========

    constructor(
        uint256 _originChainId,
        address _originContract,
        bytes32 _eventTopic0,
        address _shoeNFTAddress
    ) payable {
        originChainId = _originChainId;
        shoeNFT = IShoeNFT(_shoeNFTAddress);
        shoeRunOrigin = IShoeRunOrigin(_originContract);

        if (!vm) {
            service.subscribe(
                _originChainId,
                _originContract,
                uint256(_eventTopic0),
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }

    // ========== Main React Function ==========

    /// @notice Entry point for handling new event notifications from Reactive Network
    /// @param log Data structure containing the information about the intercepted log record
    function react(LogRecord calldata log) external vmOnly {
        // ========== Phase 1: Validate Event ==========
        if (bytes32(log.topic_0) != RUN_RECORDED_TOPIC0) {
            emit DebugString(address(0), "Validate", "WrongTopic0");
            return;
        }
        if (log.chain_id != originChainId) {
            emit DebugString(address(0), "Validate", "WrongChainId");
            return;
        }

        // ========== Phase 2: Parse Log Record ==========
        address user;
        uint256 recordId;

        emit LogParsingAttempt(
            address(0),
            log.topic_1,
            log.topic_2,
            log.data.length
        );

        // 解析data：distance, duration, timestamp (3 uint256 = 96 bytes)
        // 同时检查 data 长度是否足够
        if (log.data.length >= 96) {
            uint256 distanceMeters;
            uint256 duration;
            uint256 timestamp;

            // 直接解码，abi.decode 不会失败（只要数据长度足够）
            (distanceMeters, duration, timestamp) = abi.decode(log.data, (uint256, uint256, uint256));

            // 尝试从 topic 获取 user 和 recordId
            if (log.topic_1 != 0) {
                user = address(uint160(log.topic_1));
                recordId = log.topic_2;
                emit DebugAddress(user, "ParseTopic", user);
            }

            emit ReactiveEventReceived(user, distanceMeters, duration, timestamp, recordId);

            // ========== Phase 3: Get User Distance ==========
            uint256 totalDistance;

            try shoeRunOrigin.getUserTotalDistance(user) returns (uint256 dist) {
                totalDistance = dist;
                emit DistanceCalculated(user, distanceMeters, totalDistance);
            } catch (bytes memory reason) {
                emit UpgradeFailedBytes(user, 0, reason);
                emit UpgradeFailedString(user, 0, "GetUserTotalDistanceFailed");
                return;
            }

            // ========== Phase 4: Check Current Level ==========
            uint256 currentLevel;
            uint256 tokenId;

            try shoeNFT.getUserShoeLevel(user) returns (uint256 level) {
                currentLevel = level;
            } catch {
                currentLevel = 0;
                emit DebugString(user, "GetLevel", "NoShoeOrFailed");
            }

            try shoeNFT.getUserShoeInfo(user) returns (
                uint256 tid,
                uint256 level,
                uint256
            ) {
                tokenId = tid;
                currentLevel = level;
                emit UserLevelChecked(user, currentLevel, tokenId);
            } catch {
                emit DebugString(user, "GetShoeInfo", "Failed");
            }

            // ========== Phase 5: Attempt Upgrade ==========
            emit UpgradeAttempt(user, totalDistance, currentLevel);

            // 50km = 500 in km × 10 units
            if (totalDistance >= 500) {
                emit DebugString(user, "UpgradeCheck", "AboveThreshold");

                try shoeNFT.upgradeShoe(user, totalDistance) returns (uint256 newLevel) {
                    emit UpgradeSuccess(user, totalDistance, newLevel, currentLevel);
                    emit DebugUint(user, "UpgradeSuccessNewLevel", newLevel);
                } catch Error(string memory reason) {
                    // Custom error with message
                    emit UpgradeFailedString(user, totalDistance, reason);
                    emit DebugString(user, "CatchError", reason);
                } catch Panic(uint256 errorCode) {
                    // Panic error (assert, division by zero, etc.)
                    emit UpgradeFailedString(user, totalDistance, string(abi.encodePacked("Panic:", _uintToString(errorCode))));
                    emit DebugUint(user, "CatchPanic", errorCode);
                } catch (bytes memory lowLevelData) {
                    // Low-level error
                    emit UpgradeFailedBytes(user, totalDistance, lowLevelData);
                    emit DebugString(user, "CatchBytes", "LowLevelError");
                }
            } else {
                emit UpgradeSkipped(user, totalDistance, "BelowThreshold");
                emit DebugUint(user, "DistanceBelowThreshold", totalDistance);
            }

            emit DebugString(user, "ReactComplete", "Finished");
        } else {
            emit DebugString(address(0), "ParseData", "DataLengthTooShort");
            emit DebugUint(address(0), "DataLength", log.data.length);
        }
    }

    // ========== Helper Functions ==========

    function _uintToString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // ========== Manual Functions for Testing ==========

    /// @notice Manual upgrade function for testing purposes
    function manualUpgrade(address user, uint256 totalDistance) external {
        emit DebugString(user, "ManualUpgrade", "Start");

        uint256 currentLevel;
        try shoeNFT.getUserShoeLevel(user) returns (uint256 level) {
            currentLevel = level;
        } catch {
            currentLevel = 0;
        }

        emit DebugUint(user, "ManualCurrentLevel", currentLevel);
        emit DebugUint(user, "ManualTotalDistance", totalDistance);

        try shoeNFT.upgradeShoe(user, totalDistance) returns (uint256 newLevel) {
            emit UpgradeSuccess(user, totalDistance, newLevel, currentLevel);
        } catch Error(string memory reason) {
            emit UpgradeFailedString(user, totalDistance, reason);
            emit DebugString(user, "ManualCatchError", reason);
        } catch Panic(uint256 errorCode) {
            emit UpgradeFailedString(user, totalDistance, string(abi.encodePacked("Panic:", _uintToString(errorCode))));
        } catch (bytes memory lowLevelData) {
            emit UpgradeFailedBytes(user, totalDistance, lowLevelData);
        }
    }

    /// @notice Debug function to check current distances
    function debugUserDistance(address user) external view returns (uint256) {
        return shoeRunOrigin.getUserTotalDistance(user);
    }

    /// @notice Debug function to get user's current NFT level
    function debugUserLevel(address user) external view returns (uint256) {
        return shoeNFT.getUserShoeLevel(user);
    }

    /// @notice Debug function to get user's shoe info
    function debugUserShoeInfo(address user) external view returns (
        uint256 tokenId,
        uint256 level,
        uint256 mintedAt
    ) {
        return shoeNFT.getUserShoeInfo(user);
    }

    /// @notice Update shoe NFT contract address
    function setShoeNFT(address _shoeNFT) external authorizedSenderOnly {
        shoeNFT = IShoeNFT(_shoeNFT);
        emit DebugString(address(0), "SetShoeNFT", "Updated");
    }

    /// @notice Update shoe run origin contract address
    function setShoeRunOrigin(address _shoeRunOrigin) external authorizedSenderOnly {
        shoeRunOrigin = IShoeRunOrigin(_shoeRunOrigin);
        emit DebugString(address(0), "SetOrigin", "Updated");
    }
}
