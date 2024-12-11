// SPDX-License-Identifier: MIT 
pragma solidity 0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GreenFundCrowdsale is Ownable {
    IERC20 public greenToken;
    IERC20 public ecoToken;
    
    bool private locked;  // Biến để chống reentrancy
    uint256 constant public RATE = 3; // 1 GREEN = 3 ECO
    
    // Thông tin về đợt bán
    struct Sale {
        uint256 cap;           // Số lượng GREEN token tối đa có thể bán
        uint256 soldAmount;    // Số lượng GREEN đã bán
        uint256 startTime;     // Thời gian bắt đầu
        uint256 endTime;       // Thời gian kết thúc
        bool isActive;         // Trạng thái đợt bán
    }
    
    mapping(uint256 => Sale) public sales;
    uint256 public currentSaleId;
    
    // Events
    event SaleCreated(uint256 saleId, uint256 cap);
    event TokensPurchased(address buyer, uint256 ecoAmount, uint256 greenAmount);
    event SaleEnded(uint256 saleId, uint256 totalSold);
    
    // Modifier chống reentrancy
    modifier noReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    constructor(address _greenToken, address _ecoToken) Ownable(msg.sender) {
        greenToken = IERC20(_greenToken);
        ecoToken = IERC20(_ecoToken);
    }
    
    // Lấy số dư token của một địa chỉ
    function getBalanceTokenAdd(address account) public view returns (uint256 greenBalance, uint256 ecoBalance) {
        return (
            greenToken.balanceOf(account),
            ecoToken.balanceOf(account)
        );
    }
    
    // Lấy số lượng token còn lại có thể bán trong contract
    function getRemainingToken() public view returns (uint256) {
        return greenToken.balanceOf(address(this));
    }
    
    // Xem thông tin token đang bán
    function viewTokenSelling(uint256 saleId) public view returns (
        uint256 available,
        bool active,
        uint256 timeLeft
    ) {
        Sale storage sale = sales[saleId];
        return (
            sale.cap - sale.soldAmount,
            sale.isActive,
            block.timestamp < sale.endTime ? sale.endTime - block.timestamp : 0
        );
    }
    
    // Tạo đợt bán mới
    function createSale(
        uint256 _cap,
        uint256 _startTime,
        uint256 _duration
    ) public onlyOwner {
        require(_cap > 0, "Cap must be greater than 0");
        require(_startTime >= block.timestamp, "Start time must be in future");
        
        currentSaleId++;
        
        sales[currentSaleId] = Sale({
            cap: _cap,
            soldAmount: 0,
            startTime: _startTime,
            endTime: _startTime + _duration,
            isActive: true
        });
        
        emit SaleCreated(currentSaleId, _cap);
    }
    
    // Mua token trong đợt bán
    function buyTokens(uint256 saleId, uint256 greenAmount) public noReentrant {
        Sale storage sale = sales[saleId];
        require(sale.isActive, "Sale is not active");
        require(block.timestamp >= sale.startTime, "Sale has not started");
        require(block.timestamp <= sale.endTime, "Sale has ended");
        require(sale.soldAmount + greenAmount <= sale.cap, "Purchase would exceed cap");
        
        uint256 ecoAmount = greenAmount * RATE;
        
        // Chuyển ECO từ người mua vào contract
        require(ecoToken.transferFrom(msg.sender, address(this), ecoAmount), "ECO transfer failed");
        
        // Chuyển GREEN cho người mua
        require(greenToken.transfer(msg.sender, greenAmount), "GREEN transfer failed");
        
        sale.soldAmount += greenAmount;
        
        emit TokensPurchased(msg.sender, ecoAmount, greenAmount);
    }
    
    // Kết thúc đợt bán
    function endSale(uint256 saleId) public onlyOwner {
        Sale storage sale = sales[saleId];
        require(sale.isActive, "Sale is not active");
        
        sale.isActive = false;
        emit SaleEnded(saleId, sale.soldAmount);
    }
    
    // Rút token từ contract (chỉ owner)
    function withdrawTokens(address token, uint256 amount) public onlyOwner {
        require(IERC20(token).transfer(msg.sender, amount), "Token withdrawal failed");
    }
}
