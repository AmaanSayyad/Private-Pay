// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * Minimal ITS stub for local tests.
 *
 * It supports:
 * - `interchainTokenAddress(tokenId)` lookup
 * - `interchainTransfer(...)` pulling tokens from the sender and emitting an event
 */
contract MockInterchainTokenService {
    using SafeERC20 for IERC20;

    mapping(bytes32 => address) public tokenById;

    event InterchainTransfer(
        bytes32 indexed tokenId,
        address indexed sender,
        string destinationChain,
        bytes destinationAddress,
        uint256 amount,
        bytes metadata,
        uint256 gasValue
    );

    function setToken(bytes32 tokenId, address token) external {
        tokenById[tokenId] = token;
    }

    function interchainTokenAddress(bytes32 tokenId) external view returns (address) {
        return tokenById[tokenId];
    }

    function interchainTransfer(
        bytes32 tokenId,
        string calldata destinationChain,
        bytes calldata destinationAddress,
        uint256 amount,
        bytes calldata metadata,
        uint256 gasValue
    ) external payable {
        address token = tokenById[tokenId];
        require(token != address(0), "tokenId unset");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit InterchainTransfer(tokenId, msg.sender, destinationChain, destinationAddress, amount, metadata, gasValue);
    }
}

