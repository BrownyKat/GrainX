const { withCache } = require("./cache");

const COINBASE_API_BASE = "https://api.coinbase.com/v2/prices";
const DEFAULT_TTL_MS = Number(process.env.GRAINWATCH_CACHE_TTL_MS || 900000);

async function fetchPricePoint(pair, side) {
  const response = await fetch(`${COINBASE_API_BASE}/${pair}/${side}`);
  if (!response.ok) {
    throw new Error(`Coinbase ${side} price request failed with ${response.status}`);
  }

  const payload = await response.json();
  const amount = Number(payload?.data?.amount);

  if (!Number.isFinite(amount)) {
    throw new Error(`Coinbase ${side} price payload was invalid`);
  }

  return {
    amount,
    currency: payload.data.currency || pair.split("-")[1]
  };
}

async function getCoinbaseWalletExchange(base = "ETH", quote = "PHP") {
  const normalizedBase = String(base || "ETH").toUpperCase();
  const normalizedQuote = String(quote || "PHP").toUpperCase();
  const pair = `${normalizedBase}-${normalizedQuote}`;

  return withCache(`coinbase-wallet-exchange:${pair}`, Math.min(DEFAULT_TTL_MS, 300000), async () => {
    const [buy, sell, spot] = await Promise.all([
      fetchPricePoint(pair, "buy"),
      fetchPricePoint(pair, "sell"),
      fetchPricePoint(pair, "spot")
    ]);

    return {
      ok: true,
      mode: "live",
      base: normalizedBase,
      quote: normalizedQuote,
      pair,
      source: "Coinbase Price API",
      rates: {
        buy: buy.amount,
        sell: sell.amount,
        spot: spot.amount
      },
      generatedAt: new Date().toISOString()
    };
  });
}

module.exports = {
  getCoinbaseWalletExchange
};
