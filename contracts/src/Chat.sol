// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {GameConfig} from "./GameConfig.sol";
import {Villages} from "./Villages.sol";

/// @title Squeek Wars chat and announcements
/// @notice Messages live only in events, so the contract stores almost nothing. Any wallet with a village can talk.
///         The owner of the rule table (GameConfig.owner) posts announcements and can hide messages or mute wallets;
///         a hidden message stays on chain and the website skips it.
contract Chat {
    uint256 public constant MAX_TEXT = 280; // bytes of one message
    uint256 public constant MAX_TITLE = 80; // bytes of an announcement title
    uint256 public constant MAX_BODY = 2000; // bytes of an announcement text
    uint32 public constant MAX_COOLDOWN = 1 days;

    GameConfig public immutable config;
    Villages public immutable villages;

    uint256 public count; // messages and announcements share one id sequence, starting at 1
    uint32 public cooldown = 15; // seconds between two messages of one wallet
    mapping(address => uint64) public lastSaid;
    mapping(address => bool) public muted;

    event Said(uint256 indexed id, address indexed from, string text);
    event Announced(uint256 indexed id, string title, string text);
    event Hidden(uint256 indexed id, bool hidden);
    event Muted(address indexed who, bool muted);
    event CooldownChanged(uint32 cooldown);

    error NotOwner();
    error NoVillage();
    error WalletMuted();
    error TooSoon();
    error BadLength();
    error BadId();
    error BadCooldown();

    constructor(GameConfig config_, Villages villages_) {
        config = config_;
        villages = villages_;
    }

    modifier onlyOwner() {
        if (msg.sender != config.owner()) revert NotOwner();
        _;
    }

    /// @notice Post a message to everyone (1 to 280 bytes of text).
    function say(string calldata text) external {
        uint256 n = bytes(text).length;
        if (n == 0 || n > MAX_TEXT) revert BadLength();
        if (muted[msg.sender]) revert WalletMuted();
        if (villages.village(msg.sender).foundedAt == 0) revert NoVillage();
        if (block.timestamp < uint256(lastSaid[msg.sender]) + cooldown) revert TooSoon();
        lastSaid[msg.sender] = uint64(block.timestamp);
        emit Said(++count, msg.sender, text);
    }

    /// @notice Post an announcement. Rule changes are announced by GameConfig's own events.
    function announce(string calldata title, string calldata text) external onlyOwner {
        uint256 t = bytes(title).length;
        uint256 n = bytes(text).length;
        if (t == 0 || t > MAX_TITLE || n > MAX_BODY) revert BadLength();
        emit Announced(++count, title, text);
    }

    /// @notice Hide or show a message or an announcement on the website.
    function hide(uint256 id, bool hidden) external onlyOwner {
        if (id == 0 || id > count) revert BadId();
        emit Hidden(id, hidden);
    }

    /// @notice Stop a wallet from posting, or let it post again.
    function mute(address who, bool on) external onlyOwner {
        muted[who] = on;
        emit Muted(who, on);
    }

    function setCooldown(uint32 seconds_) external onlyOwner {
        if (seconds_ > MAX_COOLDOWN) revert BadCooldown();
        cooldown = seconds_;
        emit CooldownChanged(seconds_);
    }
}
