// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHERC20} from "./FHERC20.sol";
import {FHE, euint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FHPAY - Confidential payment token for Private-Pay using Fhenix FHE
/// @notice All balances are stored as encrypted euint64 values; public balances
///         are only indicators and MUST NOT be used for logic.
contract FHPAY is FHERC20, Ownable {
    /// @notice Optional controller (payment manager / bridge) allowed to mint/burn.
    address public controller;

    event ControllerUpdated(address indexed oldController, address indexed newController);

    constructor() FHERC20("Confidential Pay Token", "FHPAY", 6) Ownable(msg.sender) {}

    modifier onlyController() {
        require(msg.sender == controller, "FHPAY: caller is not controller");
        _;
    }

    /// @notice Set or update the controller contract that can mint/burn confidential amounts.
    function setController(address newController) external onlyOwner {
        require(newController != address(0), "FHPAY: controller is zero");
        address old = controller;
        controller = newController;
        emit ControllerUpdated(old, newController);
    }

    /// @notice Confidential mint entrypoint for the controller.
    /// @param to Recipient address.
    /// @param value Encrypted amount as euint64 (CoFHE type).
    function confidentialMintFromController(
        address to,
        euint64 value
    ) external onlyController returns (euint64 minted) {
        minted = _confidentialMint(to, value);
    }

    /// @notice Confidential burn entrypoint for the controller.
    /// @param from Address whose encrypted balance will be decreased.
    /// @param value Encrypted amount to burn.
    function confidentialBurnFromController(
        address from,
        euint64 value
    ) external onlyController returns (euint64 burned) {
        burned = _confidentialBurn(from, value);
    }

    /// @notice Unsafe cleartext mint for local development only.
    /// @dev DO NOT use in production deployments.
    function devMintPlain(
        address to,
        uint64 value
    ) external onlyOwner returns (euint64 minted) {
        minted = _mint(to, value);
    }
}


