// SPDX-License-Identifier: MIT 
pragma solidity 0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EcoToken is ERC20, Ownable {
    uint256 public maxSupply = 2000000 * 10**18;

    constructor(address initialHolder) ERC20("EcoToken", "ECO") Ownable(initialHolder) {
        _mint(msg.sender, maxSupply);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
