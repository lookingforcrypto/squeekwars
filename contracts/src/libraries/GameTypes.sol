// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {GameErrors as E} from "./GameErrors.sol";

library GameTypes {
    uint256 internal constant U = 1_000_000;
    uint256 internal constant MAP_MULTIPLIER = 7919;
    uint256 internal constant MAP_OFFSET = 1237;
    uint256 internal constant UNITS = 16; // unit slots; GameConfig enables the ones in play
    uint256 internal constant KINDS = 16; // building slots: 0..10 have built-in roles, 11..15 are free
    // building slots with a built-in role
    uint8 internal constant TH = 0;
    uint8 internal constant WALLS = 1;
    uint8 internal constant WHEEL = 2;
    uint8 internal constant STORE = 3;
    uint8 internal constant VAULT = 4;
    uint8 internal constant BURROW = 5;
    uint8 internal constant BARRACKS = 6;
    uint8 internal constant ACADEMY = 7;
    uint8 internal constant FORGE = 8;
    uint8 internal constant CLAN = 9;
    uint8 internal constant MARKET = 10;
    // unit roles
    uint8 internal constant ROLE_NORMAL = 0;
    uint8 internal constant ROLE_SCOUT = 1; // only these scout; they fight enemy scouts
    uint8 internal constant ROLE_SIEGE = 2; // these knock down Walls levels
    // building effects, applied per level on top of a slot's built-in role
    uint8 internal constant FX_NONE = 0;
    uint8 internal constant FX_DEFENSE_PCT = 1;
    uint8 internal constant FX_ATTACK_PCT = 2;
    uint8 internal constant FX_OUTPUT_PCT = 3;
    uint8 internal constant FX_STORAGE = 4;
    uint8 internal constant FX_ROOM = 5;
    uint8 internal constant FX_TRAIN_PCT = 6;
    uint8 internal constant FX_BUILD_PCT = 7;
    uint8 internal constant FX_CARRY_PCT = 8;
    uint8 internal constant FX_VAULT = 9;

    /// @dev What Army needs to know about a village, read in one call.
    struct Context {
        bool exists;
        uint16 tile;
        uint8 townHall;
        uint8 walls;
        uint8 forge;
        uint8 barracks;
        uint8 research;
        uint256 room;
        uint64 shieldUntil;
        uint16 attackPct; // building effects
        uint16 defensePct;
        uint16 carryPct;
        uint16 trainPct;
    }

    /// @dev Building effects summed over a village's levels. Storage, room and vault are additions.
    struct Mods {
        uint256 attackPct;
        uint256 defensePct;
        uint256 outputPct;
        uint256 storageAdd;
        uint256 room;
        uint256 trainPct;
        uint256 buildPct;
        uint256 carryPct;
        uint256 vault;
    }

    /// @dev Every unit slot's battle numbers, read in one call. Value is the unit's resource cost.
    struct UnitTable {
        uint256[16] attack;
        uint256[16] defense;
        uint256[16] speed;
        uint256[16] carry;
        uint256[16] room;
        uint256[16] value;
        uint8[16] role;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return a == 0 ? 0 : (a - 1) / b + 1;
    }

    function sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        z = x;
        uint256 y = (x + 1) / 2;
        while (y < z) {
            z = y;
            y = (x / y + y) / 2;
        }
    }

    function nameKey(string memory name, uint256 maximum) internal pure returns (bytes32) {
        bytes memory b = bytes(name);
        require(b.length >= 3 && b.length <= maximum, E.InvalidNameLength());
        for (uint256 i; i < b.length; ++i) {
            uint8 c = uint8(b[i]);
            require(
                (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c == 95,
                E.InvalidNameCharacter()
            );
            if (c >= 65 && c <= 90) b[i] = bytes1(c + 32);
        }
        return keccak256(b);
    }

    /// @dev 7919 is coprime with 10000, so this affine permutation visits every tile once.
    function tile(uint256 slot) internal pure returns (uint16) {
        return uint16((slot * MAP_MULTIPLIER + MAP_OFFSET) % 10000);
    }
}
