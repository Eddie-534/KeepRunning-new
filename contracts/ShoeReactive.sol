// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISystemContract {
    function subscribe(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;
}

interface IReactiveNetwork {
    function crossChainQuery(uint256 targetChainId, address targetContract, bytes calldata callData) external returns (bytes memory);
}

interface IShoeNFT {
    function upgradeShoe(address user, uint256 totalDistance) external returns (uint256);
}

struct LogRecord {
    bytes32 topic_0;
    bytes32 topic_1;
    bytes32 topic_2;
    bytes32 topic_3;
    uint256 chainId;
    address contractAddress;
    bytes data;
}

contract ShoeReactive {
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    bytes32 public constant RUN_RECORDED_TOPIC0 = keccak256("RunRecorded(address,uint256,uint256,uint256,uint256)");
    bytes4 public constant GET_USER_TOTAL_DISTANCE_SELECTOR = bytes4(keccak256("getUserTotalDistance(address)"));
    uint256 public constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;

    IReactiveNetwork public reactiveNetwork;
    address public shoeRunOrigin;
    IShoeNFT public shoeNFT;
    mapping(address => uint256) public userDistanceCache;
    ISystemContract public service;
    bool public vm;

    event ReactiveEventReceived(address indexed user, uint256 distanceMeters, uint256 duration, uint256 timestamp, uint256 recordId);
    event ShoeUpgradeTriggered(address indexed user, uint256 totalDistance, uint256 newLevel, bool success);

    constructor(
        uint256 _originChainId,
        address _originContract,
        bytes32 _eventTopic0,
        address _shoeNFTAddress,
        address _shoeRunOriginAddress
    ) payable {
        shoeNFT = IShoeNFT(_shoeNFTAddress);
        shoeRunOrigin = _shoeRunOriginAddress;

        uint256 size;
        assembly { size := extcodesize(0x0000000000000000000000000000000000fffFfF) }
        vm = size == 0;

        if (!vm) {
            service = ISystemContract(0x0000000000000000000000000000000000fffFfF);
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

    function setReactiveNetwork(address _reactiveNetwork) external {
        reactiveNetwork = IReactiveNetwork(_reactiveNetwork);
    }

    function setShoeRunOrigin(address _shoeRunOrigin) external {
        shoeRunOrigin = _shoeRunOrigin;
    }

    function setShoeNFT(address _shoeNFT) external {
        shoeNFT = IShoeNFT(_shoeNFT);
    }

    function react(LogRecord calldata log) external {
        if (log.topic_0 != RUN_RECORDED_TOPIC0) return;
        
        address user = address(uint160(uint256(log.topic_1)));
        uint256 recordId = uint256(log.topic_2);
        
        (uint256 distanceMeters, uint256 duration, uint256 timestamp) = abi.decode(
            log.data, (uint256, uint256, uint256)
        );
        
        emit ReactiveEventReceived(user, distanceMeters, duration, timestamp, recordId);
        
        uint256 distanceInKmX10 = distanceMeters / 100;
        uint256 totalDistance = userDistanceCache[user] + distanceInKmX10;
        userDistanceCache[user] = totalDistance;
        
        if (address(shoeNFT) != address(0) && totalDistance != 0) {
            try shoeNFT.upgradeShoe(user, totalDistance) returns (uint256 newLevel) {
                emit ShoeUpgradeTriggered(user, totalDistance, newLevel, true);
            } catch {
                emit ShoeUpgradeTriggered(user, totalDistance, 0, false);
            }
        }
    }

    function manualUpgrade(address user, uint256 totalDistance) external {
        if (address(shoeNFT) != address(0) && totalDistance != 0) {
            try shoeNFT.upgradeShoe(user, totalDistance) returns (uint256 newLevel) {
                emit ShoeUpgradeTriggered(user, totalDistance, newLevel, true);
            } catch {
                emit ShoeUpgradeTriggered(user, totalDistance, 0, false);
            }
        }
    }

    function storeUserDistance(address user, uint256 totalDistance) external {
        userDistanceCache[user] = totalDistance;
    }
}