import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Button } from "../components/ui/button";

const VAULT_ADDRESS = "0xYourVaultContractAddress";
const USDC_ADDRESS = "0xYourMockUSDCAddress";
const ABI = [
  "function deposit(uint256 amount) external",
  "function claim(uint256 epochId) external",
  "function getClaimable(address user, uint256 epochId) external view returns (uint256)",
  "function deposits(address) external view returns (uint256)",
  "function currentEpoch() external view returns (uint256)",
  "function investorCount() external view returns (uint256)",
  "function closeEpoch(uint256 yieldAmount) external"
];

export default function VaultApp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [vault, setVault] = useState(null);
  const [claimables, setClaimables] = useState([]);
  const [epochCount, setEpochCount] = useState(0);
  const [yieldInput, setYieldInput] = useState("");
  const [depositAmount, setDepositAmount] = useState("0");
  const [totalClaimable, setTotalClaimable] = useState("0");

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.ethereum !== "undefined" &&
      typeof ethers !== "undefined" &&
      ethers.providers?.Web3Provider
    ) {
      try {
        const p = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(p);
        p.send("eth_requestAccounts", []).then(() => {
          const s = p.getSigner();
          setSigner(s);
          s.getAddress().then(setAccount);
          setVault(new ethers.Contract(VAULT_ADDRESS, ABI, s));
        });
      } catch (error) {
        console.error("Web3Provider setup failed:", error);
      }
    }
  }, []);

  const fetchEpochData = async () => {
    if (vault && account) {
      const count = await vault.currentEpoch();
      setEpochCount(count.toNumber());
      const list = [];
      let total = ethers.BigNumber.from(0);
      for (let i = 0; i < count; i++) {
        const amt = await vault.getClaimable(account, i);
        list.push({ epoch: i, amount: ethers.utils.formatUnits(amt, 6) });
        total = total.add(amt);
      }
      setClaimables(list);
      setTotalClaimable(ethers.utils.formatUnits(total, 6));

      const deposit = await vault.deposits(account);
      setDepositAmount(ethers.utils.formatUnits(deposit, 6));
    }
  };

  const handleDeposit = async () => {
    const usdc = new ethers.Contract(USDC_ADDRESS, ["function approve(address,uint256) public returns (bool)", "function decimals() view returns (uint8)"], signer);
    const decimals = await usdc.decimals();
    const amount = ethers.utils.parseUnits("100", decimals);
    await usdc.approve(VAULT_ADDRESS, amount);
    await vault.deposit(amount);
    fetchEpochData();
  };

  const handleClaim = async (epochId) => {
    await vault.claim(epochId);
    fetchEpochData();
  };

  const handleCloseEpoch = async () => {
    const yieldAmount = ethers.utils.parseUnits(yieldInput, 6);
    await vault.closeEpoch(yieldAmount);
    setYieldInput("");
    fetchEpochData();
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h1 className="text-xl font-bold">TLC Vault Dashboard</h1>
      <div>
        <p className="text-sm">Connected Account:</p>
        <p className="font-mono">{account}</p>
      </div>
      <div className="py-2">
        <p>📊 <strong>Your Deposit:</strong> {depositAmount} USDC</p>
        <p>💸 <strong>Total Claimable Yield:</strong> {totalClaimable} USDC</p>
      </div>
      <div>
        <Button onClick={fetchEpochData}>🔄 Refresh Epoch Claimables</Button>
        <ul className="mt-4 space-y-2">
          {claimables.map(({ epoch, amount }) => (
            <li key={epoch} className="flex justify-between items-center border p-2 rounded">
              <span>Epoch #{epoch} – 💰 {amount} USDC</span>
              <Button onClick={() => handleClaim(epoch)} disabled={amount === "0.0"}>Claim</Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-x-4">
        <Button onClick={handleDeposit}>💸 Deposit 100 USDC</Button>
      </div>
      <div className="pt-4 border-t mt-4">
        <h2 className="text-lg font-semibold">📦 Admin: Close Epoch</h2>
        <input
          className="border p-2 rounded w-full mt-2"
          type="text"
          value={yieldInput}
          onChange={(e) => setYieldInput(e.target.value)}
          placeholder="Enter yield amount for this epoch (e.g. 1000)"
        />
        <Button className="mt-2" onClick={handleCloseEpoch} disabled={!yieldInput}>✅ Close Current Epoch</Button>
      </div>
    </div>
  );
}
