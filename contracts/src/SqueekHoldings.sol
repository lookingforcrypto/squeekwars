// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title The Squeeks a wallet holds, in the wallet and in Squeekchain staking
/// @notice SeedLedger reads one address with balanceOf(player) for every Squeek bonus. Pointing it here (setReaders)
///         counts Squeeks deposited in Squeekchain staking too, without touching the game contracts.
///         Wallet: the Squeek collection's balanceOf. Staking: accountPower(player).nftPower in level-1 Squeeks,
///         so a merged Squeek counts by its power (level 2 = 2.2 level-1 Squeeks, rounded down; at least 1).
///         A read that fails counts as 0: a Squeekchain pause or upgrade never blocks the game.
contract SqueekHoldings {
    /// @dev Each outside read gets this much gas; SeedLedger gives this contract 100,000 in all.
    uint256 public constant READ_GAS = 40_000;

    address public immutable collection;
    address public immutable staking;
    /// @notice nftPower of one level-1 Squeek: staking.basePower(collection, 1) × staking.POWER_UNIT()
    uint256 public immutable unitPower;

    error InvalidAddress();
    error StakingUnreadable();

    constructor(address collection_, address staking_) {
        if (collection_ == address(0) || staking_ == address(0)) revert InvalidAddress();
        collection = collection_;
        staking = staking_;
        (bool ok1, bytes memory d1) = staking_.staticcall(abi.encodeWithSignature("basePower(address,uint8)", collection_, uint8(1)));
        (bool ok2, bytes memory d2) = staking_.staticcall(abi.encodeWithSignature("POWER_UNIT()"));
        if (!ok1 || !ok2 || d1.length != 32 || d2.length != 32) revert StakingUnreadable();
        uint256 unit = abi.decode(d1, (uint256)) * abi.decode(d2, (uint256));
        if (unit == 0) revert StakingUnreadable();
        unitPower = unit;
    }

    /// @notice Squeeks in the wallet plus Squeeks in staking (in level-1 Squeeks)
    function balanceOf(address player) external view returns (uint256) {
        return walletCount(player) + stakedCount(player);
    }

    function walletCount(address player) public view returns (uint256 n) {
        (bool ok, bytes memory d) = collection.staticcall{gas: READ_GAS}(abi.encodeWithSignature("balanceOf(address)", player));
        if (ok && d.length == 32) n = abi.decode(d, (uint256));
    }

    function stakedCount(address player) public view returns (uint256 n) {
        (bool ok, bytes memory d) = staking.staticcall{gas: READ_GAS}(abi.encodeWithSignature("accountPower(address)", player));
        if (!ok || d.length != 64) return 0;
        (uint256 nftPower,) = abi.decode(d, (uint256, uint256));
        if (nftPower == 0) return 0;
        n = nftPower / unitPower;
        if (n == 0) n = 1;
    }
}
