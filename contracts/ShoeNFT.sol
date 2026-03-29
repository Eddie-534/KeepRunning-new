// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ShoeNFT
 * @dev NFT contract deployed on Lasna
 * Represents running shoes that level up based on running distance
 * Dynamic minting: new level NFTs are minted on upgrade, no pre-minting needed
 */
contract ShoeNFT is ERC721, ERC721Enumerable, Ownable {
    // Events
    event ShoeUpgraded(
        address indexed user,
        uint256 indexed tokenId,
        uint256 oldLevel,
        uint256 newLevel,
        uint256 totalDistance
    );

    event ShoeMinted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 level
    );

    event ReactiveContractUpdated(address indexed oldContract, address indexed newContract);

    // Level configuration
    struct LevelConfig {
        uint256 requiredDistance; // in km
        string name;
        string description;
    }

    // Shoe metadata
    struct ShoeInfo {
        uint256 level;
        uint256 tokenId;
        uint256 mintedAt;
    }

    // State variables
    uint256 private _tokenIdCounter;
    address public shoeReactiveContract;

    // Level configurations (distances in km)
    uint256 public constant LEVEL_1_DISTANCE = 0;     // 0 km - Base
    uint256 public constant LEVEL_2_DISTANCE = 50;    // 50 km - Bronze
    uint256 public constant LEVEL_3_DISTANCE = 150;   // 150 km - Silver
    uint256 public constant LEVEL_4_DISTANCE = 300;   // 300 km - Gold
    uint256 public constant LEVEL_5_DISTANCE = 500;   // 500 km - Rainbow

    uint256 public constant MAX_LEVEL = 5;

    // User's shoe and level tracking
    mapping(address => ShoeInfo) private _userShoes;

    // Token ID to level mapping
    mapping(uint256 => uint256) private _tokenLevels;

    // Level metadata
    LevelConfig[6] public levelConfigs;

    // Base URI for metadata
    string private _baseTokenURI;

    // Errors
    error InsufficientDistance();
    error AlreadyMaxLevel();
    error UserAlreadyHasShoe();
    error TokenDoesNotExist();
    error UnauthorizedReactiveContract();

    modifier onlyShoeReactive() {
        if (msg.sender != shoeReactiveContract) revert UnauthorizedReactiveContract();
        _;
    }

    constructor(address initialOwner) ERC721("Keep Running Shoe", "KRSHOE") Ownable(initialOwner) {
        // Initialize level configurations
        levelConfigs[1] = LevelConfig({
            requiredDistance: LEVEL_1_DISTANCE,
            name: "Base Runner",
            description: "The beginning of your running journey"
        });
        levelConfigs[2] = LevelConfig({
            requiredDistance: LEVEL_2_DISTANCE,
            name: "Bronze Warrior",
            description: "50 km conquered - Bronze status achieved"
        });
        levelConfigs[3] = LevelConfig({
            requiredDistance: LEVEL_3_DISTANCE,
            name: "Silver Knight",
            description: "150 km conquered - Silver status achieved"
        });
        levelConfigs[4] = LevelConfig({
            requiredDistance: LEVEL_4_DISTANCE,
            name: "Golden Champion",
            description: "300 km conquered - Golden status achieved"
        });
        levelConfigs[5] = LevelConfig({
            requiredDistance: LEVEL_5_DISTANCE,
            name: "Rainbow Legend",
            description: "500 km conquered - Legendary status achieved"
        });

        // Set default base URI
        _baseTokenURI = "https://api.keeprunning.io/metadata/";
    }

    /**
     * @dev Grant a base shoe to a new user (dynamic minting)
     * @param to The address to receive the base NFT
     */
    function grantBaseShoe(address to) external {
        if (_userShoes[to].tokenId != 0) revert UserAlreadyHasShoe();

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        _tokenLevels[tokenId] = 1;
        _userShoes[to] = ShoeInfo({
            level: 1,
            tokenId: tokenId,
            mintedAt: block.timestamp
        });

        emit ShoeMinted(to, tokenId, 1);
    }

    /**
     * @dev Upgrade a user's shoe to a higher level (dynamic minting)
     * @param user The user whose shoe to upgrade
     * @param totalDistance User's total running distance in km × 10
     * @return The new level
     */
    function upgradeShoe(address user, uint256 totalDistance) external onlyShoeReactive returns (uint256) {
        ShoeInfo storage shoe = _userShoes[user];
        uint256 currentLevel = shoe.level;

        if (currentLevel >= MAX_LEVEL) revert AlreadyMaxLevel();

        // totalDistance is already in km × 10 (e.g., 55km = 550)
        uint256 distanceInKm = totalDistance;
        uint256 targetLevel = _calculateTargetLevel(distanceInKm);

        if (targetLevel <= currentLevel) revert InsufficientDistance();

        uint256 oldLevel = currentLevel;
        uint256 newLevel = targetLevel;

        // 动态铸造新等级的 NFT
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        _safeMint(user, newTokenId);
        _tokenLevels[newTokenId] = newLevel;

        // 销毁旧 NFT（如果存在）
        if (shoe.tokenId != 0) {
            _burn(shoe.tokenId);
        }

        // 更新用户鞋信息
        shoe.level = newLevel;
        shoe.tokenId = newTokenId;

        emit ShoeUpgraded(user, newTokenId, oldLevel, newLevel, totalDistance);
        return newLevel;
    }

    // View functions
    function getUserShoeLevel(address user) external view returns (uint256) {
        if (_userShoes[user].tokenId == 0) return 0;
        return _userShoes[user].level;
    }

    function getUserShoeInfo(address user) external view returns (uint256 tokenId, uint256 level, uint256 mintedAt) {
        ShoeInfo memory shoe = _userShoes[user];
        return (shoe.tokenId, shoe.level, shoe.mintedAt);
    }

    function getRequiredDistance(uint256 level) external pure returns (uint256) {
        if (level == 1) return LEVEL_1_DISTANCE;
        if (level == 2) return LEVEL_2_DISTANCE;
        if (level == 3) return LEVEL_3_DISTANCE;
        if (level == 4) return LEVEL_4_DISTANCE;
        if (level == 5) return LEVEL_5_DISTANCE;
        return 0;
    }

    function setReactiveContract(address newContract) external onlyOwner {
        address oldContract = shoeReactiveContract;
        shoeReactiveContract = newContract;
        emit ReactiveContractUpdated(oldContract, newContract);
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function getTokenLevel(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _tokenLevels[tokenId];
    }

    // Internal functions
    function _calculateTargetLevel(uint256 distance) private pure returns (uint256) {
        if (distance >= LEVEL_5_DISTANCE) return 5;
        if (distance >= LEVEL_4_DISTANCE) return 4;
        if (distance >= LEVEL_3_DISTANCE) return 3;
        if (distance >= LEVEL_2_DISTANCE) return 2;
        return 1;
    }

    // Overrides required by Solidity / OpenZeppelin v5
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(_baseTokenURI, Strings.toString(tokenId)));
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}