import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import crowdsaleABI from "./build/Crowdsale.abi.json";
import ecoTokenABI from "./build/EcoToken.abi.json";
import greenTokenABI from "./build/GreenToken.abi.json";
import "./App.css";

const GREEN_TOKEN_ADDRESS = "0xad0852764e45037e9feaa8af5d48029d2ab37365";
const ECO_TOKEN_ADDRESS = "0x2a1094c204e6de85d02015e5cf1a618923851c24";
const CROWDSALE_ADDRESS = "0xaf42FF1B473D18a67e892A5120F15C903EFe501c";

function App() {
  const [account, setAccount] = useState("");
  const [greenBalance, setGreenBalance] = useState("0");
  const [ecoBalance, setEcoBalance] = useState("0");
  const [saleInfo, setSaleInfo] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [price, setPrice] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  useEffect(() => {
    if (account) {
      fetchBalances(account);
      fetchCurrentSales();
      fetchPurchaseHistory(account);
      checkOwnerStatus(account);
    }
  }, [account]);

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
    }
  };

  // Format numbers to be more readable (e.g., 0.000000000000000002 → 2)
  const formatNumber = (strNum) => {
    const num = parseFloat(strNum);
    if (num === 0) return "0";
    if (num < 0.000001) return num.toExponential(2);
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0,
    });
  };

  // Truncate address for display
  const truncateAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const checkOwnerStatus = async (address) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      CROWDSALE_ADDRESS,
      crowdsaleABI,
      provider
    );
    const owner = await contract.owner();
    setIsOwner(owner.toLowerCase() === address.toLowerCase());
  };

  const fetchBalances = async (address) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const greenToken = new ethers.Contract(
        GREEN_TOKEN_ADDRESS,
        greenTokenABI,
        provider
      );
      const ecoToken = new ethers.Contract(
        ECO_TOKEN_ADDRESS,
        ecoTokenABI,
        provider
      );

      const greenBalance = await greenToken.balanceOf(address);
      setGreenBalance(ethers.utils.formatEther(greenBalance));

      const ecoBalance = await ecoToken.balanceOf(address);
      setEcoBalance(ethers.utils.formatEther(ecoBalance));
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  const fetchCurrentSales = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, provider);
  
      const sales = await contract.viewTokenSelling();
      const count = await contract.countSale();
  
      // Check if there are sales
      if (!sales || sales.length === 0) {
        setSaleInfo([]);
        return;
      }
  
      const parsedSales = [];
      for (let i = 0; i < count; i++) {
        const sale = sales[i];
        if (sale.amount > 0) { // Only process sales with a positive amount
            const totalCost = await contract.getCost(i + 3); // Pass the correct sale ID
            parsedSales.push({
              id: i + 1,
              seller: sale.seller,
              tokenAddress: sale.tokenAddress,
              amount: ethers.utils.formatUnits(sale.amount, 18), // Assuming 18 decimals
              price: ethers.utils.formatUnits(sale.pricePerToken, 18), // Assuming 18 decimals
              totalCost: ethers.utils.formatEther(totalCost), // Convert cost from wei to ETH/ECO
            });
        }
        
      }
  
      console.log("Fetched sales with total costs:", parsedSales);
      console.log();
      setSaleInfo(parsedSales);
    } catch (error) {
      console.error("Error fetching sales info:", error);
    }
  };
  

  const fetchPurchaseHistory = async (address) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        CROWDSALE_ADDRESS,
        crowdsaleABI,
        provider
      );

      const history = await contract.getPurchaseHistory(address);
      setPurchaseHistory(
        history.map((entry) => ({
          amount: ethers.utils.formatEther(entry.amount),
          date: new Date(entry.timestamp.toNumber() * 1000).toLocaleString(),
        }))
      );
    } catch (error) {
      console.error("Error fetching purchase history:", error);
    }
  };

  const buyToken = async (saleId) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);
  
      // Get the cost from the contract
      const totalCost = await contract.getCost(saleId);
  
      // Fetch the ECO balance
      const ecoToken = new ethers.Contract(ECO_TOKEN_ADDRESS, ecoTokenABI, provider);
      const ecoBalance = await ecoToken.balanceOf(account);
  
      // Check balance
      if (ethers.BigNumber.from(ecoBalance).lt(totalCost)) {
        alert("Insufficient ECO balance to complete the purchase.");
        return;
      }
  
      // Proceed with purchase
      const tx = await contract.buyToken(saleId);
      await tx.wait();
      alert("Purchase successful!");
  
      // Refresh state
      fetchBalances(account);
      fetchCurrentSales();
    } catch (error) {
      console.error("Error buying token:", error);
      alert("Purchase failed. Check the console for details.");
    }
  };
  

  const approveTokens = async (amount) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const ecoToken = new ethers.Contract(ECO_TOKEN_ADDRESS, ecoTokenABI, signer);
  
      const tx = await ecoToken.approve(CROWDSALE_ADDRESS, ethers.utils.parseEther(amount));
      await tx.wait();
      alert("Approval successful!");
    } catch (error) {
      console.error("Error approving tokens:", error);
      alert("Failed to approve tokens.");
    }
  };
  

  const setTokenPrice = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      CROWDSALE_ADDRESS,
      crowdsaleABI,
      signer
    );
    const tx = await contract.setPrice(GREEN_TOKEN_ADDRESS, price);
    await tx.wait();
  };

  const sellToken = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        CROWDSALE_ADDRESS,
        crowdsaleABI,
        signer
      );
      const tx = await contract.sellToken(GREEN_TOKEN_ADDRESS, sellAmount);
      await tx.wait();
      console.log("Token sale successful");
    } catch (error) {
      console.error("Error selling token:", error);
    }
  };

  const withdrawTokens = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      CROWDSALE_ADDRESS,
      crowdsaleABI,
      signer
    );
    const tx = await contract.withdrawToken(GREEN_TOKEN_ADDRESS);
    await tx.wait();
  };

  return (
    <div className="App">
      <h1>Green Fund ICO</h1>
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div className="account-info">
          <p>Account: {account}</p>
          <div className="balance-container">
            <div className="balance-card">
              <p>Green Balance: {greenBalance}</p>
            </div>
            <div className="balance-card">
              <p>Eco Balance: {ecoBalance}</p>
            </div>
          </div>

          <h2>Current Sales</h2>
          <ul>
          <button onClick={() => approveTokens("50")}>Approve 50 ECO</button>
            {saleInfo.map((sale) => (
              <li key={sale.id}>
                Sale ID: {sale.id}, Seller: {truncateAddress(sale.seller)}, Rate: {sale.price},
                Value: {sale.amount}, Total Cost:{" "}
                {(sale.totalCost)} ECO
                <button onClick={() => buyToken(sale.id)}>Buy</button>
              </li>
            ))}
          </ul>

          {isOwner ? (
            <div className="owner-functions">
              <h2>Owner Functions</h2>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Set Price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <button className="btn btn-set-price" onClick={setTokenPrice}>
                  Set Price
                </button>
              </div>

              <div className="input-group">
                <input
                  type="text"
                  placeholder="Amount to Sell"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                />
                <button className="btn btn-sell" onClick={sellToken}>
                  Sell Tokens
                </button>
              </div>

              <div className="button-group">
                <button className="btn btn-withdraw" onClick={withdrawTokens}>
                  Withdraw Tokens
                </button>
              </div>
            </div>
          ) : (
            <div className="purchase-history">
              <h2>Purchase History</h2>
              <ul>
                {purchaseHistory.map((entry, index) => (
                  <li key={index}>
                    Amount: {entry.amount}, Date: {entry.date}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
