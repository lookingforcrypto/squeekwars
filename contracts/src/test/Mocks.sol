// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ISqueekCore, ISqueekNFT} from "../interfaces/ISqueek.sol";

/// @notice Test doubles for SqueekCore and the Squeek ERC-721. Never deployed with the game.
contract MockCore is ISqueekCore {
    uint64 public work = 100_000;

    function setWork(uint64 value) external {
        work = value;
    }

    function state() external view returns (CoreState memory s) {
        s.settledThroughRound = 777;
        s.cumulativeWork = work;
        s.blockHeight = 999;
    }
}

contract MockNFT is ISqueekNFT {
    mapping(address => uint256) public balances;

    function setBalance(address who, uint256 value) external {
        balances[who] = value;
    }

    function balanceOf(address who) external view returns (uint256) {
        return balances[who];
    }
}
