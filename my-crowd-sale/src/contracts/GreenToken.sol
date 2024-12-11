// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GreenToken is ERC20, Ownable {
    uint256 public maxSupply = 1000000 * 10**18;  // 1 million GREEN tokens

    constructor(address initialOwner) Ownable(initialOwner) ERC20("GreenFund", "GREEN") {
        _mint(initialOwner, maxSupply);
    }

    // Hàm để mint thêm token (nếu cần)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // Hàm để burn token
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}