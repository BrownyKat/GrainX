const rawGrainWatchData = document.getElementById("grainwatch-data")?.textContent || "{}";
const grainWatchData = JSON.parse(rawGrainWatchData);

const walletState = {
  account: "",
  network: "Not connected",
  chainId: "",
  balance: "0.0000",
  provider: null,
  signer: null,
  walletName: "Wallet",
  isMetaMask: false,
  isCoinbaseWallet: false,
  busy: false
};

const baseChains = {
  "0x2105": {
    chainId: "0x2105",
    chainName: "Base Mainnet",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://base.blockscout.com"]
  },
  "0x14a34": {
    chainId: "0x14a34",
    chainName: "Base Sepolia",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia-explorer.base.org"]
  }
};

const supportedChains = {
  ...Object.fromEntries(Object.entries(baseChains).map(([chainId, chain]) => [chainId, chain.chainName])),
  "0xaa36a7": "Ethereum Sepolia",
  "0x13882": "Polygon Amoy",
  "0x66eee": "Arbitrum Sepolia"
};

const preferredBaseChainId = grainWatchData.baseDesk.chainHex || `0x${Number(grainWatchData.baseDesk.chainId || 84532).toString(16)}`;
const baseDraftStorageKey = "grainwatch-base-draft";
const baseTicketStorageKey = "grainwatch-base-ticket";
const baseAttestationAbi = [
  "function publishIntent(bytes32 digest,string commodity,string location,uint256 quantityKg,string side,uint256 unitPriceX100,uint256 referenceTimestamp)"
];

if (baseChains[preferredBaseChainId]) {
  baseChains[preferredBaseChainId] = {
    ...baseChains[preferredBaseChainId],
    chainName: grainWatchData.baseDesk.preferredChain || baseChains[preferredBaseChainId].chainName,
    rpcUrls: [grainWatchData.baseDesk.rpcUrl || baseChains[preferredBaseChainId].rpcUrls[0]],
    blockExplorerUrls: [grainWatchData.baseDesk.explorerUrl || baseChains[preferredBaseChainId].blockExplorerUrls[0]]
  };
  supportedChains[preferredBaseChainId] = baseChains[preferredBaseChainId].chainName;
}

function chartOptions(minY = 0, callback) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          color: "#667085",
          font: { family: "IBM Plex Mono", size: 11 }
        }
      },
      tooltip: {
        backgroundColor: "#172033",
        borderColor: "#d7dee7",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#e2e8f0",
        titleFont: { family: "IBM Plex Mono", size: 11 },
        bodyFont: { family: "IBM Plex Mono", size: 11 }
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(215, 222, 231, 0.85)" },
        ticks: { color: "#667085", font: { family: "IBM Plex Mono", size: 10 } }
      },
      y: {
        min: minY,
        grid: { color: "rgba(215, 222, 231, 0.85)" },
        ticks: {
          color: "#667085",
          font: { family: "IBM Plex Mono", size: 10 },
          callback: callback || undefined
        }
      }
    }
  };
}

function getInjectedProviders() {
  if (Array.isArray(window.ethereum?.providers) && window.ethereum.providers.length) {
    return window.ethereum.providers;
  }

  return window.ethereum ? [window.ethereum] : [];
}

function getInjectedProvider() {
  const providers = getInjectedProviders();
  return (
    providers.find((provider) => provider?.isCoinbaseWallet) ||
    providers.find((provider) => provider?.isMetaMask) ||
    providers[0] ||
    null
  );
}

function getWalletName(provider = getInjectedProvider()) {
  if (!provider) return "Wallet";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider.isMetaMask) return "MetaMask";
  return "Injected Wallet";
}

function hasInjectedWallet() {
  return Boolean(getInjectedProvider() && window.ethers);
}

function openWalletInstallPage() {
  window.open(grainWatchData.baseDesk.walletInstallUrl || "https://www.coinbase.com/wallet", "_blank", "noopener");
}

function shortAddress(value) {
  if (!value) return "Not connected";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function updateClock() {
  const localTime = new Intl.DateTimeFormat("en-PH", {
    timeZone: grainWatchData.meta?.timezone || "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
  const clockEl = document.getElementById("headerClock");
  if (clockEl) clockEl.textContent = localTime;
}

function updateFooterStatus(message) {
  const footer = document.getElementById("footerStatus");
  if (footer) footer.textContent = message;
}

function exportJsonFile(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatPhp(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function getCommodityByKey(key) {
  return grainWatchData.commodities.find((commodity) => commodity.key === key) || grainWatchData.commodities[0];
}

function getLocationMarket(locationName) {
  return (
    grainWatchData.locationMarkets.find((location) => location.location === locationName) ||
    grainWatchData.locationMarkets.find((location) => location.slug === locationName) ||
    grainWatchData.locationMarkets[0]
  );
}

function buildReceiptPayload() {
  const latestTicket = loadSignedBaseTicket();

  return {
    app: grainWatchData.meta.brand,
    focus: grainWatchData.meta.focus,
    generatedAt: new Date().toISOString(),
    latestBlock: grainWatchData.oracle.latestBlock,
    wallet: {
      account: walletState.account,
      network: walletState.network,
      chainId: walletState.chainId
    },
    latestTicketDigest: latestTicket?.digest || "",
    thresholds: grainWatchData.settings.thresholds,
    openAlerts: grainWatchData.alertHistory.filter((alert) => alert.state === "Active").length,
    commodities: grainWatchData.commodities.map((commodity) => ({
      key: commodity.key,
      value: commodity.value,
      signal: commodity.signal
    }))
  };
}

function resetWalletState() {
  const injectedProvider = getInjectedProvider();
  walletState.account = "";
  walletState.network = injectedProvider ? `${getWalletName(injectedProvider)} ready` : "Wallet not detected";
  walletState.chainId = "";
  walletState.balance = "0.0000";
  walletState.provider = null;
  walletState.signer = null;
  walletState.walletName = getWalletName(injectedProvider);
  walletState.isMetaMask = Boolean(injectedProvider?.isMetaMask);
  walletState.isCoinbaseWallet = Boolean(injectedProvider?.isCoinbaseWallet);
}

function renderWalletUI() {
  const connectBtn = document.getElementById("walletConnectBtn");
  const switchBtn = document.getElementById("walletSwitchBtn");
  const networkLabel = document.getElementById("walletNetworkLabel");
  const accountLabel = document.getElementById("walletAccountLabel");
  const oracleWalletNetwork = document.getElementById("oracleWalletNetwork");
  const oracleWalletAccount = document.getElementById("oracleWalletAccount");
  const oracleWalletBalance = document.getElementById("oracleWalletBalance");
  const hasAccount = Boolean(walletState.account);
  const onPreferredBase = walletState.chainId === preferredBaseChainId;

  if (connectBtn) {
    connectBtn.textContent = walletState.busy
      ? "Connecting..."
      : hasAccount
        ? `${walletState.walletName} Connected`
        : hasInjectedWallet()
          ? `Connect ${walletState.walletName}`
          : "Install Wallet";
    connectBtn.disabled = walletState.busy;
  }

  if (switchBtn) {
    switchBtn.textContent = walletState.busy ? "Switching..." : onPreferredBase ? "Base Ready" : "Switch Base";
    switchBtn.disabled = !hasInjectedWallet() || walletState.busy || (hasAccount && onPreferredBase);
  }

  if (networkLabel) {
    networkLabel.textContent = hasAccount
      ? onPreferredBase
        ? `${walletState.network} | ticket ready`
        : `${walletState.network} | switch before signing`
      : walletState.network;
  }

  if (accountLabel) {
    accountLabel.textContent = hasAccount
      ? `${shortAddress(walletState.account)} | ${walletState.balance} ETH`
      : hasInjectedWallet()
        ? `Ready to connect with ${walletState.walletName}`
        : "Install Coinbase Wallet, MetaMask, or open in Base App";
  }

  if (oracleWalletNetwork) {
    oracleWalletNetwork.textContent = hasAccount && onPreferredBase ? `${walletState.network} | Ready` : walletState.network;
  }

  if (oracleWalletAccount) {
    oracleWalletAccount.textContent = hasAccount ? shortAddress(walletState.account) : "Not connected";
  }

  if (oracleWalletBalance) {
    oracleWalletBalance.textContent = `${walletState.balance} ETH`;
  }

  window.dispatchEvent(
    new CustomEvent("grainwatch:wallet-updated", {
      detail: {
        account: walletState.account,
        network: walletState.network,
        chainId: walletState.chainId,
        balance: walletState.balance
      }
    })
  );
}

async function syncWalletState({ requestAccounts = false } = {}) {
  const injectedProvider = getInjectedProvider();

  if (!hasInjectedWallet() || !injectedProvider) {
    resetWalletState();
    renderWalletUI();
    return null;
  }

  walletState.provider = new window.ethers.BrowserProvider(injectedProvider);
  walletState.walletName = getWalletName(injectedProvider);
  walletState.isMetaMask = Boolean(injectedProvider?.isMetaMask);
  walletState.isCoinbaseWallet = Boolean(injectedProvider?.isCoinbaseWallet);

  const network = await walletState.provider.getNetwork();
  const chainHex = `0x${network.chainId.toString(16)}`;
  walletState.chainId = chainHex;
  walletState.network = supportedChains[chainHex] || `Chain ${network.chainId}`;

  const accounts = await walletState.provider.send(requestAccounts ? "eth_requestAccounts" : "eth_accounts", []);

  if (!accounts.length) {
    walletState.account = "";
    walletState.balance = "0.0000";
    walletState.signer = null;
    renderWalletUI();
    return null;
  }

  walletState.signer = await walletState.provider.getSigner();
  walletState.account = accounts[0];

  const balance = await walletState.provider.getBalance(walletState.account);
  walletState.balance = Number(window.ethers.formatEther(balance)).toFixed(4);

  renderWalletUI();
  return walletState;
}

async function connectWallet() {
  if (!hasInjectedWallet()) {
    openWalletInstallPage();
    updateFooterStatus("Last update: no injected wallet was detected in this browser");
    resetWalletState();
    renderWalletUI();
    return null;
  }

  try {
    walletState.busy = true;
    renderWalletUI();

    const connected = await syncWalletState({ requestAccounts: true });
    if (!connected) {
      updateFooterStatus(`Last update: ${walletState.walletName} connection was cancelled`);
      return null;
    }

    updateFooterStatus(`Last update: ${walletState.walletName} connected on ${walletState.network}`);
    return connected;
  } catch (error) {
    updateFooterStatus(
      error?.code === 4001
        ? `Last update: ${walletState.walletName} connection was rejected`
        : `Last update: ${walletState.walletName} connection failed`
    );
    return null;
  } finally {
    walletState.busy = false;
    renderWalletUI();
  }
}

async function switchToBase(chainId = preferredBaseChainId) {
  const injectedProvider = getInjectedProvider();

  if (!hasInjectedWallet() || !injectedProvider) {
    openWalletInstallPage();
    updateFooterStatus("Last update: no injected wallet was detected in this browser");
    resetWalletState();
    renderWalletUI();
    return null;
  }

  try {
    walletState.busy = true;
    renderWalletUI();

    await injectedProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }]
    });
  } catch (error) {
    if (error?.code === 4902) {
      await injectedProvider.request({
        method: "wallet_addEthereumChain",
        params: [baseChains[chainId]]
      });
    } else {
      updateFooterStatus(
        error?.code === 4001
          ? "Last update: Base network switch was rejected"
          : "Last update: Base network switch failed"
      );
      return null;
    }
  } finally {
    walletState.busy = false;
    renderWalletUI();
  }

  const connected = await syncWalletState();
  updateFooterStatus(`Last update: wallet switched to ${walletState.network}`);
  return connected || walletState;
}

async function ensureBaseWallet() {
  let connected = walletState.signer ? walletState : await connectWallet();
  if (!connected) return null;

  if (walletState.chainId !== preferredBaseChainId) {
    connected = await switchToBase(preferredBaseChainId);
  }

  return connected || null;
}

function saveBaseDraft(draft) {
  localStorage.setItem(baseDraftStorageKey, JSON.stringify(draft));
}

function loadBaseDraft() {
  try {
    return JSON.parse(localStorage.getItem(baseDraftStorageKey) || "null");
  } catch (_error) {
    return null;
  }
}

function clearBaseDraft() {
  localStorage.removeItem(baseDraftStorageKey);
}

function saveSignedBaseTicket(ticket) {
  localStorage.setItem(baseTicketStorageKey, JSON.stringify(ticket));
}

function loadSignedBaseTicket() {
  try {
    return JSON.parse(localStorage.getItem(baseTicketStorageKey) || "null");
  } catch (_error) {
    return null;
  }
}

function buildBaseTicket(draftInput = {}) {
  const draft = {
    commodityKey: draftInput.commodityKey || grainWatchData.commodities[0].key,
    location: draftInput.location || grainWatchData.locationDefaults.selectedLocation,
    quantityKg: Math.max(1, Math.round(Number(draftInput.quantityKg || 1000))),
    side: draftInput.side || "WATCH"
  };

  const commodity = getCommodityByKey(draft.commodityKey);
  const location = getLocationMarket(draft.location);
  const locationGrain = location.grains.find((grain) => grain.key === commodity.key);
  const unitPrice = locationGrain?.price || commodity.value;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiryTimestamp = nowSeconds + grainWatchData.baseDesk.expiryMinutes * 60;
  const unitPriceX100 = Math.round(unitPrice * 100);

  const domain = {
    name: "GrainWatchPH",
    version: "1",
    chainId: grainWatchData.baseDesk.chainId
  };

  const types = {
    GrainTicket: [
      { name: "commodityKey", type: "string" },
      { name: "commodityName", type: "string" },
      { name: "location", type: "string" },
      { name: "side", type: "string" },
      { name: "quantityKg", type: "uint256" },
      { name: "unitPriceX100", type: "uint256" },
      { name: "referenceTimestamp", type: "uint256" },
      { name: "expiryTimestamp", type: "uint256" }
    ]
  };

  const value = {
    commodityKey: commodity.key,
    commodityName: commodity.name,
    location: location.location,
    side: draft.side,
    quantityKg: draft.quantityKg,
    unitPriceX100,
    referenceTimestamp: nowSeconds,
    expiryTimestamp
  };

  const digest = window.ethers.TypedDataEncoder.hash(domain, types, value);

  return {
    draft,
    commodity,
    location,
    unitPrice,
    notional: Number((unitPrice * draft.quantityKg).toFixed(2)),
    domain,
    types,
    value,
    digest
  };
}

async function signBaseTicket(draftInput = {}) {
  const connected = await ensureBaseWallet();
  if (!connected?.signer) {
    throw new Error("Wallet is not ready");
  }

  const ticket = buildBaseTicket(draftInput);
  const signature = await connected.signer.signTypedData(ticket.domain, ticket.types, ticket.value);
  const signedTicket = {
    ...ticket,
    signature,
    signedBy: connected.account,
    signedAt: new Date().toISOString(),
    network: connected.network
  };

  saveBaseDraft(ticket.draft);
  saveSignedBaseTicket(signedTicket);
  updateFooterStatus(`Last update: Base grain ticket signed at ${new Date().toLocaleTimeString("en-PH", { hour12: false })}`);
  return signedTicket;
}

async function publishBaseTicket(ticketInput) {
  const contractAddress = grainWatchData.baseDesk.contractAddress;
  if (!contractAddress) {
    throw new Error("Base attestation contract is not configured");
  }

  const connected = await ensureBaseWallet();
  if (!connected?.signer) {
    throw new Error("Wallet is not ready");
  }

  const ticket = ticketInput?.signature ? ticketInput : await signBaseTicket(ticketInput?.draft || ticketInput);
  const contract = new window.ethers.Contract(contractAddress, baseAttestationAbi, connected.signer);
  const transaction = await contract.publishIntent(
    ticket.digest,
    ticket.value.commodityName,
    ticket.value.location,
    ticket.value.quantityKg,
    ticket.value.side,
    ticket.value.unitPriceX100,
    ticket.value.referenceTimestamp
  );

  updateFooterStatus(`Last update: Base transaction submitted ${transaction.hash.slice(0, 12)}...`);
  return {
    ...ticket,
    transactionHash: transaction.hash
  };
}

document.getElementById("walletConnectBtn")?.addEventListener("click", connectWallet);
document.getElementById("walletSwitchBtn")?.addEventListener("click", () => switchToBase());

const injectedProvider = getInjectedProvider();

if (injectedProvider?.on) {
  injectedProvider.on("accountsChanged", () => {
    syncWalletState().catch(() => {
      resetWalletState();
      renderWalletUI();
    });
  });

  injectedProvider.on("chainChanged", () => {
    syncWalletState().catch(() => {
      resetWalletState();
      renderWalletUI();
    });
  });
}

if (window.Chart) {
  Chart.defaults.color = "#667085";
  Chart.defaults.borderColor = "rgba(215, 222, 231, 0.85)";
}

resetWalletState();
updateClock();
renderWalletUI();
syncWalletState().catch(() => {
  resetWalletState();
  renderWalletUI();
});
setInterval(updateClock, 1000);

window.GrainWatchApp = {
  data: grainWatchData,
  walletState,
  chartOptions,
  updateFooterStatus,
  buildReceiptPayload,
  connectWallet,
  switchToBase,
  ensureBaseWallet,
  preferredBaseChainId,
  supportedChains,
  formatPhp,
  exportJsonFile,
  saveBaseDraft,
  loadBaseDraft,
  clearBaseDraft,
  buildBaseTicket,
  signBaseTicket,
  publishBaseTicket,
  loadSignedBaseTicket
};
