// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@fhenixprotocol/contracts/FHE.sol";
import "@fhenixprotocol/contracts/access/Permissioned.sol";

contract PrivatePayFhenix is Permissioned {
    using FHE for euint32;

    mapping(address => euint32) private balances;

    function deposit(uint32 amount) external {
        euint32 encAmount = FHE.asEuint32(amount);
        balances[msg.sender] = balances[msg.sender] + encAmount;
    }

    function privateTransfer(address to, uint32 amount) external {
        euint32 encAmount = FHE.asEuint32(amount);
        balances[msg.sender] = balances[msg.sender] - encAmount;
        balances[to] = balances[to] + encAmount;
    }

    function getEncryptedBalance(
        Permission calldata perm
    ) external view returns (uint256) {
        // hasAccess checks if the permit was signed by the caller
        require(checkPermission(perm), "Unauthorized: Invalid Permit");
        return FHE.sealoutput(balances[msg.sender], perm.publicKey);
    }

    function hasEnoughBalance(
        uint32 minAmount,
        Permission calldata perm
    ) external view returns (uint256) {
        require(checkPermission(perm), "Unauthorized: Invalid Permit");
        euint32 required = FHE.asEuint32(minAmount);
        ebool result = balances[msg.sender].gte(required);
        return FHE.sealoutput(result, perm.publicKey);
    }
}
