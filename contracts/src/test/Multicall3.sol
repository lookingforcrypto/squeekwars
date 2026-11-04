// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice The aggregate3 call of Multicall3, for local test chains (Sepolia has the canonical one).
contract Multicall3 {
    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    function aggregate3(Call3[] calldata calls) external payable returns (Result[] memory returnData) {
        returnData = new Result[](calls.length);
        for (uint256 i; i < calls.length; ++i) {
            (bool ok, bytes memory data) = calls[i].target.call(calls[i].callData);
            require(ok || calls[i].allowFailure, "Multicall3: call failed");
            returnData[i] = Result(ok, data);
        }
    }
}
