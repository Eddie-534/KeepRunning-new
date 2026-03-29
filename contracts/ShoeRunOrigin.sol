// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ShoeRunOrigin
 * @dev Running record contract deployed on Sepolia
 * Users submit their running records which trigger NFT upgrades on Lasna via Reactive Network
 */
contract ShoeRunOrigin {
    // Events
    event RunRecorded(
        address indexed user,
        uint256 distance,      // distance in meters (e.g., 10000 = 10km)
        uint256 duration,       // duration in seconds
        uint256 timestamp,
        uint256 indexed recordId
    );

    event RunRecordUpdated(
        address indexed user,
        uint256 indexed recordId,
        uint256 newDistance,
        uint256 newDuration,
        uint256 newTimestamp
    );

    // Structs
    struct RunRecord {
        address user;
        uint256 distance;      // in meters
        uint256 duration;       // in seconds
        uint256 timestamp;
        bool isValid;
    }

    // State variables
    uint256 private _recordCounter;
    uint256 private constant MIN_TIME_BETWEEN_RUNS = 5 minutes; // Anti-spam: minimum 5 minutes between runs
    uint256 private constant MAX_DISTANCE_PER_RUN = 100000 ;    // Maximum distance per run (100km)

    // User data
    mapping(address => uint256) private _userTotalDistance;   // Total distance in meters
    mapping(address => uint256) private _userLastRunTime;     // Last run timestamp
    mapping(uint256 => RunRecord) private _runRecords;        // recordId => RunRecord
    mapping(address => uint256[]) private _userRecords;       // user => recordIds

    // Statistics
    uint256 public totalDistance;       // Total distance across all users (meters)
    uint256 public totalRuns;          // Total number of runs
    uint256 public totalUsers;         // Total unique users

    mapping(address => bool) private _hasRunBefore;

    // Errors
    error InvalidDistance();
    error InvalidDuration();
    error RunTooFrequent();
    error RecordNotFound();
    error UnauthorizedAccess();

    /**
     * @dev Record a new running activity
     * @param distance Distance in meters (e.g., 5000 = 5km)
     * @param duration Duration in seconds (e.g., 1800 = 30 minutes)
     */
    function recordRun(uint256 distance, uint256 duration) external {
        // Validate inputs
        if (distance == 0) revert InvalidDistance();
        if (distance > MAX_DISTANCE_PER_RUN) revert InvalidDistance();
        if (duration == 0) revert InvalidDuration();

        // Anti-spam: check time since last run
        if (block.timestamp - _userLastRunTime[msg.sender] < MIN_TIME_BETWEEN_RUNS) {
            revert RunTooFrequent();
        }

        // Update record counter
        uint256 recordId = ++_recordCounter;

        // Create run record
        _runRecords[recordId] = RunRecord({
            user: msg.sender,
            distance: distance,
            duration: duration,
            timestamp: block.timestamp,
            isValid: true
        });

        // Update user data
        _userTotalDistance[msg.sender] += distance;
        _userLastRunTime[msg.sender] = block.timestamp;
        _userRecords[msg.sender].push(recordId);

        // Update global statistics
        totalDistance += distance;
        totalRuns++;

        // Track unique users
        if (!_hasRunBefore[msg.sender]) {
            _hasRunBefore[msg.sender] = true;
            totalUsers++;
        }

        // Emit event (this is what the Reactive contract listens for)
        emit RunRecorded(msg.sender, distance, duration, block.timestamp, recordId);
    }

    /**
     * @dev Update an existing run record (only by the record owner)
     * @param recordId The ID of the record to update
     * @param newDistance New distance in meters
     * @param newDuration New duration in seconds
     * @param newTimestamp Original timestamp to preserve
     */
    function updateRunRecord(
        uint256 recordId,
        uint256 newDistance,
        uint256 newDuration,
        uint256 newTimestamp
    ) external {
        if (_runRecords[recordId].user != msg.sender) revert UnauthorizedAccess();
        if (recordId > _recordCounter || recordId == 0) revert RecordNotFound();

        // Calculate distance difference
        uint256 oldDistance = _runRecords[recordId].distance;
        if (oldDistance > 0) {
            _userTotalDistance[msg.sender] = _userTotalDistance[msg.sender] - oldDistance + newDistance;
            totalDistance = totalDistance - oldDistance + newDistance;
        }

        // Update record
        _runRecords[recordId].distance = newDistance;
        _runRecords[recordId].duration = newDuration;
        _runRecords[recordId].timestamp = newTimestamp;

        emit RunRecordUpdated(msg.sender, recordId, newDistance, newDuration, newTimestamp);
    }

    /**
     * @dev Get user's total running distance
     * @param user The user address
     * @return Total distance in km × 10 (e.g., 500 = 50km, 555 = 55.5km)
     */
    function getUserTotalDistance(address user) external view returns (uint256) {
        return _userTotalDistance[user] / 100; // Convert meters to km × 10
    }

    /**
     * @dev Get user's total running distance in meters
     * @param user The user address
     * @return Total distance in meters
     */
    function getUserTotalDistanceMeters(address user) external view returns (uint256) {
        return _userTotalDistance[user];
    }

    
    function getRunRecord(uint256 recordId) external view returns (
        address user,
        uint256 distance,
        uint256 duration,
        uint256 timestamp,
        bool isValid
    ) {
        RunRecord memory record = _runRecords[recordId];
        return (record.user, record.distance, record.duration, record.timestamp, record.isValid);
    }

    /**
     * @dev Get all record IDs for a user
     * @param user The user address
     * @return Array of record IDs
     */
    function getUserRecordIds(address user) external view returns (uint256[] memory) {
        return _userRecords[user];
    }

    /**
     * @dev Get the number of runs for a user
     * @param user The user address
     * @return Number of runs
     */
    function getUserRunCount(address user) external view returns (uint256) {
        return _userRecords[user].length;
    }

    /**
     * @dev Get the last run timestamp for a user
     * @param user The user address
     * @return Last run timestamp
     */
    function getUserLastRunTime(address user) external view returns (uint256) {
        return _userLastRunTime[user];
    }

    /**
     * @dev Get total number of records
     * @return Total record count
     */
    function getTotalRecords() external view returns (uint256) {
        return _recordCounter;
    }

    /**
     * @dev Check if a user can record a new run (anti-spam)
     * @param user The user address
     * @return Boolean indicating if user can record
     */
    function canRecordRun(address user) external view returns (bool) {
        return block.timestamp - _userLastRunTime[user] >= MIN_TIME_BETWEEN_RUNS;
    }

    /**
     * @dev Get time until next run can be recorded
     * @param user The user address
     * @return Seconds until next run can be recorded (0 if ready)
     */
    function getTimeUntilNextRun(address user) external view returns (uint256) {
        if (block.timestamp - _userLastRunTime[user] >= MIN_TIME_BETWEEN_RUNS) {
            return 0;
        }
        return MIN_TIME_BETWEEN_RUNS - (block.timestamp - _userLastRunTime[user]);
    }

    /**
     * @dev Get leaderboard (top runners by distance)
     * @param limit Maximum number of entries to return
     * @return addresses Array of top runner addresses
     * @return distances Array of corresponding distances (in km * 10)
     * @notice This is a simplified version - production version should use indexed storage
     */
    function getLeaderboard(uint256 limit) external view returns (
        address[] memory addresses,
        uint256[] memory distances
    ) {
        // For simplicity, this function returns empty arrays
        // In production, you would maintain a sorted data structure
        addresses = new address[](0);
        distances = new uint256[](0);
    }

    
    function getStatistics() external view returns (
        uint256 totalDistanceInMeters,
        uint256 totalRunsCount,
        uint256 totalUsersCount,
        uint256 totalRecordsCount
    ) {
        return (totalDistance, totalRuns, totalUsers, _recordCounter);
    }
}
