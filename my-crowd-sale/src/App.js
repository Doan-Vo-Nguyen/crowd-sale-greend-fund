import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import crowdsaleABI from './build/Crowdsale.abi.json';
import ecoTokenABI from './build/EcoToken.abi.json';
import greenTokenABI from './build/GreenToken.abi.json';
import './App.css';

const GREEN_TOKEN_ADDRESS = "0xad0852764e45037e9feaa8af5d48029d2ab37365";
const ECO_TOKEN_ADDRESS = "0x2a1094c204e6de85d02015e5cf1a618923851c24";
const CROWDSALE_ADDRESS = "0x6ab3199d7c0069c6fd6332bf7ceedb85d96b8e2c";

function App() {
    const [account, setAccount] = useState('');
    const [greenBalance, setGreenBalance] = useState('0');
    const [ecoBalance, setEcoBalance] = useState('0');
    const [saleInfo, setSaleInfo] = useState([]);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [isOwner, setIsOwner] = useState(false);
    const [price, setPrice] = useState('');
    const [sellAmount, setSellAmount] = useState('');

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
                method: 'eth_requestAccounts',
            });
            setAccount(accounts[0]);
        }
    };

    const checkOwnerStatus = async (address) => {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, provider);
        const owner = await contract.owner();
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
    };

    const fetchBalances = async (address) => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const greenToken = new ethers.Contract(GREEN_TOKEN_ADDRESS, greenTokenABI, provider);
            const ecoToken = new ethers.Contract(ECO_TOKEN_ADDRESS, ecoTokenABI, provider);

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
            const sales = [];
            
            // Assuming the contract has a method to get all sales
            const salesCount = await contract.salesCount();

            for (let i = 0; i < salesCount; i++) {
                const sale = await contract.sales(i);
                sales.push({
                    id: i,
                    cap: ethers.utils.formatEther(sale.cap),
                    sold: ethers.utils.formatEther(sale.soldAmount),
                    rate: ethers.utils.formatUnits(sale.rate, 0),
                    remaining: ethers.utils.formatEther(sale.cap.sub(sale.soldAmount)),
                    active: sale.isActive
                });
            }

            setSaleInfo(sales);
        } catch (error) {
            console.error("Error fetching sale info:", error);
        }
    };

    const fetchPurchaseHistory = async (address) => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, provider);

            const history = await contract.getPurchaseHistory(address);
            setPurchaseHistory(history.map(entry => ({
                amount: ethers.utils.formatEther(entry.amount),
                date: new Date(entry.timestamp.toNumber() * 1000).toLocaleString()
            })));
        } catch (error) {
            console.error("Error fetching purchase history:", error);
        }
    };

    const buyToken = async (saleId, amount) => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);

            await approveTokens(amount, GREEN_TOKEN_ADDRESS);

            const tx = await contract.buyToken(saleId, ethers.utils.parseEther(amount));
            await tx.wait();

            console.log('Token purchase successful');
        } catch (error) {
            console.error('Error buying token:', error);
        }
    };

    const approveTokens = async (amount, tokenAddress) => {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const token = new ethers.Contract(tokenAddress, greenTokenABI, signer);
        const tx = await token.approve(CROWDSALE_ADDRESS, ethers.utils.parseEther(amount));
        await tx.wait();
    };

    const setTokenPrice = async () => {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);
        const tx = await contract.setPrice(GREEN_TOKEN_ADDRESS, price);
        await tx.wait();
    };

    const sellToken = async () => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);
            const tx = await contract.sellToken(GREEN_TOKEN_ADDRESS, ethers.utils.parseEther(sellAmount));
            await tx.wait();
            console.log('Token sale successful');
        } catch (error) {
            console.error('Error selling token:', error);
        }
    };

    const withdrawTokens = async () => {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);
        const tx = await contract.withdrawToken();
        await tx.wait();
    };

    return (
        <div className="App">
            <h1>Green Fund ICO</h1>
            {!account ? (
                <button onClick={connectWallet}>Connect Wallet</button>
            ) : (
                <div>
                    <p>Account: {account}</p>
                    <p>Green Balance: {greenBalance}</p>
                    <p>Eco Balance: {ecoBalance}</p>

                    <h2>Current Sales</h2>
                    <ul>
                        {saleInfo.map(sale => (
                            <li key={sale.id}>
                                Sale ID: {sale.id}, Rate: {sale.rate}, Remaining: {sale.remaining}
                                <button onClick={() => buyToken(sale.id, "1")}>Buy 1 Token</button>
                            </li>
                        ))}
                    </ul>

                    <h2>Purchase History</h2>
                    <ul>
                        {purchaseHistory.map((entry, index) => (
                            <li key={index}>
                                Amount: {entry.amount}, Date: {entry.date}
                            </li>
                        ))}
                    </ul>

                    {isOwner && (
                        <div>
                            <h2>Owner Functions</h2>
                            <input type="text" placeholder="Set Price" value={price} onChange={(e) => setPrice(e.target.value)} />
                            <button onClick={setTokenPrice}>Set Price</button>
                            <input type="text" placeholder="Amount to Sell" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} />
                            <button onClick={sellToken}>Sell Tokens</button>
                            <button onClick={withdrawTokens}>Withdraw Tokens</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
