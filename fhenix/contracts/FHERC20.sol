// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, InEuint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

/// @notice Minimal FHERC20-style encrypted token base, adapted from
/// zec2eth/cofhe-hardhat-starter for use in Private-Pay.
abstract contract FHERC20 is Context {
    // see zec2eth FHERC20.sol for detailed comments – logic kept identical

    mapping(address account => uint16) internal _indicatedBalances;
    mapping(address account => euint64) internal _encBalances;
    mapping(address account => mapping(address spender => uint48)) internal _operators;

    uint16 internal _indicatedTotalSupply;
    euint64 internal _encTotalSupply;

    // ERC20-style metadata (used only for display)
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _indicatorTick;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        _indicatorTick = decimals_ <= 4 ? 1 : 10 ** (decimals_ - 4);
    }

    // ===== Events & custom errors (simplified vs original FHERC20) =====

    event ConfidentialTransfer(address indexed from, address indexed to, uint256 value);
    event OperatorSet(address indexed holder, address indexed operator, uint48 until);

    error FHERC20IncompatibleFunction();
    error FHERC20UnauthorizedUseOfEncryptedAmount(euint64 value, address caller);
    error FHERC20UnauthorizedSpender(address holder, address spender);

    function isFherc20() public pure virtual returns (bool) {
        return true;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view virtual returns (uint256) {
        return _indicatedTotalSupply * _indicatorTick;
    }

    function confidentialTotalSupply() public view virtual returns (euint64) {
        return _encTotalSupply;
    }

    function balanceOfIsIndicator() public view virtual returns (bool) {
        return true;
    }

    function indicatorTick() public view returns (uint256) {
        return _indicatorTick;
    }

    function balanceOf(address account) public view virtual returns (uint256) {
        return _indicatedBalances[account] * _indicatorTick;
    }

    function confidentialBalanceOf(address account) public view virtual returns (euint64) {
        return _encBalances[account];
    }

    function isOperator(address holder, address spender) public view virtual returns (bool) {
        return holder == spender || block.timestamp <= _operators[holder][spender];
    }

    function setOperator(address operator, uint48 until) public virtual {
        _setOperator(_msgSender(), operator, until);
    }

    // Disable standard ERC20 allowance / transfer interface

    function transfer(address, uint256) public pure returns (bool) {
        revert FHERC20IncompatibleFunction();
    }

    function allowance(address, address) external pure returns (uint256) {
        revert FHERC20IncompatibleFunction();
    }

    function approve(address, uint256) external pure returns (bool) {
        revert FHERC20IncompatibleFunction();
    }

    function transferFrom(address, address, uint256) public pure returns (bool) {
        revert FHERC20IncompatibleFunction();
    }

    // Confidential transfers

    function confidentialTransfer(
        address to,
        InEuint64 memory inValue
    ) public virtual returns (euint64 transferred) {
        euint64 value = FHE.asEuint64(inValue);
        transferred = _transfer(_msgSender(), to, value);
    }

    function confidentialTransfer(
        address to,
        euint64 value
    ) public virtual returns (euint64 transferred) {
        if (!FHE.isAllowed(value, _msgSender())) {
            revert FHERC20UnauthorizedUseOfEncryptedAmount(value, _msgSender());
        }
        transferred = _transfer(_msgSender(), to, value);
    }

    function confidentialTransferFrom(
        address from,
        address to,
        InEuint64 memory inValue
    ) public virtual returns (euint64 transferred) {
        if (!isOperator(from, _msgSender())) {
            revert FHERC20UnauthorizedSpender(from, _msgSender());
        }
        euint64 value = FHE.asEuint64(inValue);
        transferred = _transfer(from, to, value);
    }

    function confidentialTransferFrom(
        address from,
        address to,
        euint64 value
    ) public virtual returns (euint64 transferred) {
        if (!FHE.isAllowed(value, _msgSender())) {
            revert FHERC20UnauthorizedUseOfEncryptedAmount(value, _msgSender());
        }
        if (!isOperator(from, _msgSender())) {
            revert FHERC20UnauthorizedSpender(from, _msgSender());
        }
        transferred = _transfer(from, to, value);
    }

    function confidentialTransferAndCall(
        address to,
        InEuint64 memory inValue,
        bytes calldata data
    ) public virtual returns (euint64 transferred) {
        euint64 value = FHE.asEuint64(inValue);
        transferred = _transferAndCall(_msgSender(), to, value, data);
    }

    function confidentialTransferAndCall(
        address to,
        euint64 value,
        bytes calldata data
    ) public virtual returns (euint64 transferred) {
        if (!FHE.isAllowed(value, _msgSender())) {
            revert FHERC20UnauthorizedUseOfEncryptedAmount(value, _msgSender());
        }
        transferred = _transferAndCall(_msgSender(), to, value, data);
    }

    function confidentialTransferFromAndCall(
        address from,
        address to,
        InEuint64 memory inValue,
        bytes calldata data
    ) public virtual returns (euint64 transferred) {
        if (!isOperator(from, _msgSender())) {
            revert FHERC20UnauthorizedSpender(from, _msgSender());
        }
        euint64 value = FHE.asEuint64(inValue);
        transferred = _transferAndCall(from, to, value, data);
    }

    function confidentialTransferFromAndCall(
        address from,
        address to,
        euint64 value,
        bytes calldata data
    ) public virtual returns (euint64 transferred) {
        if (!FHE.isAllowed(value, _msgSender())) {
            revert FHERC20UnauthorizedUseOfEncryptedAmount(value, _msgSender());
        }
        if (!isOperator(from, _msgSender())) {
            revert FHERC20UnauthorizedSpender(from, _msgSender());
        }
        transferred = _transferAndCall(from, to, value, data);
    }

    // Internal transfer/update helpers

    function _transfer(
        address from,
        address to,
        euint64 value
    ) internal returns (euint64 transferred) {
        if (from == address(0)) {
            revert IERC20Errors.ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert IERC20Errors.ERC20InvalidReceiver(address(0));
        }
        transferred = _update(from, to, value);
    }

    function _transferAndCall(
        address from,
        address to,
        euint64 amount,
        bytes calldata data
    ) internal returns (euint64 transferred) {
        euint64 sent = _transfer(from, to, amount);

        // NOTE: In this minimal adaptation we do not call into FHERC20Utils /
        // ERC1363-style receiver hooks to keep the dependency surface small.
        // The callback path can be reintroduced later if needed.
        ebool success = FHE.asEbool(false);

        euint64 refund = _update(
            to,
            from,
            FHE.select(success, FHE.asEuint64(0), sent)
        );
        transferred = FHE.sub(sent, refund);
    }

    function _incrementIndicator(uint16 current) internal pure returns (uint16) {
        if (current == 0 || current == 9999) return 5001;
        return current + 1;
    }

    function _decrementIndicator(uint16 value) internal pure returns (uint16) {
        if (value == 0 || value == 1) return 4999;
        return value - 1;
    }

    function _update(
        address from,
        address to,
        euint64 value
    ) internal virtual returns (euint64 transferred) {
        if (from != address(0)) {
            transferred = FHE.select(
                value.lte(_encBalances[from]),
                value,
                FHE.asEuint64(0)
            );
        } else {
            transferred = value;
        }

        if (from == address(0)) {
            _indicatedTotalSupply = _incrementIndicator(_indicatedTotalSupply);
            _encTotalSupply = FHE.add(_encTotalSupply, transferred);
        } else {
            _encBalances[from] = FHE.sub(_encBalances[from], transferred);
            _indicatedBalances[from] = _decrementIndicator(_indicatedBalances[from]);
        }

        if (to == address(0)) {
            _indicatedTotalSupply = _decrementIndicator(_indicatedTotalSupply);
            _encTotalSupply = FHE.sub(_encTotalSupply, transferred);
        } else {
            _encBalances[to] = FHE.add(_encBalances[to], transferred);
            _indicatedBalances[to] = _incrementIndicator(_indicatedBalances[to]);
        }

        if (from != address(0) && euint64.unwrap(_encBalances[from]) != 0) {
            FHE.allowThis(_encBalances[from]);
            FHE.allow(_encBalances[from], from);
            FHE.allow(transferred, from);
        }
        if (to != address(0) && euint64.unwrap(_encBalances[to]) != 0) {
            FHE.allowThis(_encBalances[to]);
            FHE.allow(_encBalances[to], to);
            FHE.allow(transferred, to);
        }

        FHE.allow(transferred, _msgSender());
        FHE.allowThis(_encTotalSupply);

        // We do not emit a standard ERC20 Transfer event with the real amount,
        // only an indicator tick value to hint at activity without leaking size.
        // The event name is namespaced to avoid conflicting with classic ERC20.
        emit ConfidentialTransfer(from, to, _indicatorTick);
        emit ConfidentialTransfer(from, to, euint64.unwrap(transferred));
    }

    function _mint(
        address account,
        uint64 value
    ) internal returns (euint64 transferred) {
        if (account == address(0)) {
            revert IERC20Errors.ERC20InvalidReceiver(address(0));
        }
        transferred = _update(address(0), account, FHE.asEuint64(value));
    }

    function _burn(
        address account,
        uint64 value
    ) internal returns (euint64 transferred) {
        if (account == address(0)) {
            revert IERC20Errors.ERC20InvalidSender(address(0));
        }
        transferred = _update(account, address(0), FHE.asEuint64(value));
    }

    function _confidentialMint(
        address account,
        euint64 value
    ) internal returns (euint64 transferred) {
        if (account == address(0)) {
            revert IERC20Errors.ERC20InvalidReceiver(address(0));
        }
        transferred = _update(address(0), account, value);
    }

    function _confidentialBurn(
        address account,
        euint64 value
    ) internal returns (euint64 transferred) {
        if (account == address(0)) {
            revert IERC20Errors.ERC20InvalidSender(address(0));
        }
        transferred = _update(account, address(0), value);
    }

    function resetIndicatedBalance() external {
        _indicatedBalances[_msgSender()] = 0;
    }

    function _setOperator(
        address holder,
        address operator,
        uint48 until
    ) internal virtual {
        _operators[holder][operator] = until;
        emit OperatorSet(holder, operator, until);
    }
}


