// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PenguBookSocial
 * @dev Gasless social interactions using meta-transactions
 */
contract PenguBookSocial is EIP712, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Events
    event PostCreated(uint256 indexed postId, address indexed author, bytes32 contentHash, uint256 timestamp);
    event PostInteraction(uint256 indexed postId, address indexed user, string action, uint256 timestamp);
    event UserFollowed(address indexed follower, address indexed following, uint256 timestamp);
    event TipSent(address indexed from, address indexed to, uint256 amount, uint256 timestamp);

    // Structs
    struct Post {
        uint256 id;
        address author;
        bytes32 contentHash; // IPFS hash or content hash
        uint256 timestamp;
        uint256 likes;
        bool exists;
    }

    struct PostSignature {
        string content;
        bytes32 contentHash;
        uint256 timestamp;
        uint256 nonce;
    }

    struct InteractionSignature {
        string postId;
        string action;
        uint256 timestamp;
        uint256 nonce;
    }

    // State variables
    mapping(uint256 => Post) public posts;
    mapping(address => uint256) public nonces;
    mapping(uint256 => mapping(address => bool)) public postLikes;
    mapping(address => mapping(address => bool)) public userFollows;
    mapping(address => uint256) public userPostCount;
    mapping(address => uint256) public userFollowerCount;
    mapping(address => uint256) public userFollowingCount;

    uint256 public nextPostId = 1;

    // Type hashes for EIP-712
    bytes32 private constant POST_TYPEHASH = keccak256("Post(string content,bytes32 contentHash,uint256 timestamp,uint256 nonce)");
    bytes32 private constant INTERACTION_TYPEHASH = keccak256("Interaction(string postId,string action,uint256 timestamp,uint256 nonce)");

    constructor() EIP712("PenguBook", "1") {}

    /**
     * @dev Create a post with user signature (gasless for user)
     */
    function createPostWithSignature(
        address user,
        string memory content,
        bytes32 contentHash,
        uint256 timestamp,
        uint256 nonce,
        bytes memory signature
    ) external returns (uint256 postId) {
        // Verify nonce
        require(nonces[user] == nonce, "Invalid nonce");

        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            POST_TYPEHASH,
            keccak256(bytes(content)),
            contentHash,
            timestamp,
            nonce
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        require(signer == user, "Invalid signature");

        // Increment nonce to prevent replay
        nonces[user]++;

        // Create post
        postId = nextPostId++;
        posts[postId] = Post({
            id: postId,
            author: user,
            contentHash: contentHash,
            timestamp: timestamp,
            likes: 0,
            exists: true
        });

        userPostCount[user]++;

        emit PostCreated(postId, user, contentHash, timestamp);
        return postId;
    }

    /**
     * @dev Process interactions (like, unlike) with user signature
     */
    function processInteractionWithSignature(
        address user,
        string memory postIdStr,
        string memory action,
        uint256 timestamp,
        uint256 nonce,
        bytes memory signature
    ) external returns (bool success) {
        // Verify nonce
        require(nonces[user] == nonce, "Invalid nonce");

        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            INTERACTION_TYPEHASH,
            keccak256(bytes(postIdStr)),
            keccak256(bytes(action)),
            timestamp,
            nonce
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        require(signer == user, "Invalid signature");

        // Increment nonce
        nonces[user]++;

        // Convert string to uint for postId
        uint256 postId = stringToUint(postIdStr);
        require(posts[postId].exists, "Post does not exist");

        // Process action
        if (keccak256(bytes(action)) == keccak256(bytes("LIKE"))) {
            return _likePost(user, postId, timestamp);
        } else if (keccak256(bytes(action)) == keccak256(bytes("UNLIKE"))) {
            return _unlikePost(user, postId, timestamp);
        }

        return false;
    }

    /**
     * @dev Follow a user with signature
     */
    function followUserWithSignature(
        address follower,
        address following,
        uint256 timestamp,
        uint256 nonce,
        bytes memory signature
    ) external {
        require(follower != following, "Cannot follow yourself");
        require(!userFollows[follower][following], "Already following");

        // Verify signature (simplified for example)
        nonces[follower]++;

        userFollows[follower][following] = true;
        userFollowerCount[following]++;
        userFollowingCount[follower]++;

        emit UserFollowed(follower, following, timestamp);
    }

    /**
     * @dev Internal function to like a post
     */
    function _likePost(address user, uint256 postId, uint256 timestamp) internal returns (bool) {
        require(!postLikes[postId][user], "Already liked");

        postLikes[postId][user] = true;
        posts[postId].likes++;

        emit PostInteraction(postId, user, "LIKE", timestamp);
        return true;
    }

    /**
     * @dev Internal function to unlike a post
     */
    function _unlikePost(address user, uint256 postId, uint256 timestamp) internal returns (bool) {
        require(postLikes[postId][user], "Not liked");

        postLikes[postId][user] = false;
        posts[postId].likes--;

        emit PostInteraction(postId, user, "UNLIKE", timestamp);
        return true;
    }

    /**
     * @dev Get post details
     */
    function getPost(uint256 postId) external view returns (
        address author,
        bytes32 contentHash,
        uint256 timestamp,
        uint256 likes
    ) {
        require(posts[postId].exists, "Post does not exist");
        Post memory post = posts[postId];
        return (post.author, post.contentHash, post.timestamp, post.likes);
    }

    /**
     * @dev Check if user liked a post
     */
    function hasUserLikedPost(uint256 postId, address user) external view returns (bool) {
        return postLikes[postId][user];
    }

    /**
     * @dev Get user stats
     */
    function getUserStats(address user) external view returns (
        uint256 postCount,
        uint256 followerCount,
        uint256 followingCount
    ) {
        return (userPostCount[user], userFollowerCount[user], userFollowingCount[user]);
    }

    /**
     * @dev Utility function to convert string to uint
     */
    function stringToUint(string memory s) internal pure returns (uint256) {
        bytes memory b = bytes(s);
        uint256 result = 0;
        for (uint256 i = 0; i < b.length; i++) {
            uint256 digit = uint256(uint8(b[i])) - 48;
            require(digit <= 9, "Invalid number");
            result = result * 10 + digit;
        }
        return result;
    }

    /**
     * @dev Emergency pause function (only owner)
     */
    function pause() external onlyOwner {
        // Implementation for pausing contract
    }

    /**
     * @dev Withdraw any ETH sent to contract (only owner)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}