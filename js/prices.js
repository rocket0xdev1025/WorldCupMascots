/**
 * Token prices in the top bar via public endpoints (no API key).
 * - SOL: CoinGecko simple price
 * - SPL tokens: DexScreener token endpoint (best pair by liquidity)
 */
(function () {
  var REFRESH_MS = 30000;
  var SOL_MINT = "So11111111111111111111111111111111111111112";
  var SOL_COINGECKO_URL =
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
  var DEXSCREENER_TOKEN_URL = "https://api.dexscreener.com/latest/dex/tokens/";
  var DEXSCREENER_SOL_PAIR_URL = "https://api.dexscreener.com/latest/dex/pairs/solana/";

  function formatUsd(n) {
    if (!isFinite(n)) return "—";
    var abs = Math.abs(n);
    var digits = abs >= 100 ? 2 : abs >= 1 ? 3 : abs >= 0.01 ? 4 : 6;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    }).format(n);
  }

  function formatCompactUsd(n) {
    if (!isFinite(n)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(n);
  }

  async function fetchJson(url) {
    var res = await fetch(url, { method: "GET", credentials: "omit" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  async function fetchSolUsd() {
    try {
      var json = await fetchJson(SOL_COINGECKO_URL);
      var p =
        json && json.solana && typeof json.solana.usd === "number" ? json.solana.usd : NaN;
      if (isFinite(p)) return p;
    } catch (err) {}

    try {
      var dex = await fetchDexTokenData(SOL_MINT);
      if (dex && isFinite(dex.priceUsd)) return dex.priceUsd;
    } catch (err2) {}

    return NaN;
  }

  function pickBestPair(pairs) {
    if (!pairs || !pairs.length) return null;
    var best = null;
    var bestLiq = -1;
    for (var i = 0; i < pairs.length; i++) {
      var liq = pairs[i] && pairs[i].liquidity && typeof pairs[i].liquidity.usd === "number" ? pairs[i].liquidity.usd : 0;
      if (liq > bestLiq) {
        bestLiq = liq;
        best = pairs[i];
      }
    }
    return best;
  }

  async function fetchDexTokenData(token) {
    var json = await fetchJson(DEXSCREENER_TOKEN_URL + encodeURIComponent(token));
    var best = pickBestPair(json && json.pairs ? json.pairs : []);
    var price = best && typeof best.priceUsd === "string" ? parseFloat(best.priceUsd) : NaN;
    if (!isFinite(price) && best && typeof best.priceUsd === "number") price = best.priceUsd;
    var mcap =
      best && typeof best.marketCap === "number"
        ? best.marketCap
        : best && typeof best.fdv === "number"
          ? best.fdv
          : NaN;
    return { priceUsd: price, mcapUsd: mcap };
  }

  async function fetchDexSolPairUsd(pairAddress) {
    var json = await fetchJson(DEXSCREENER_SOL_PAIR_URL + encodeURIComponent(pairAddress));
    var pair = json && json.pair ? json.pair : null;
    var p = pair && typeof pair.priceUsd === "string" ? parseFloat(pair.priceUsd) : NaN;
    if (!isFinite(p) && pair && typeof pair.priceUsd === "number") p = pair.priceUsd;
    return p;
  }

  function setState(pill, state) {
    pill.classList.remove("is-loading", "is-error");
    if (state) pill.classList.add(state);
  }

  function getTokens() {
    var pills = document.querySelectorAll(".price-pill[data-mint]");
    var tokens = [];
    for (var i = 0; i < pills.length; i++) {
      var m = pills[i].getAttribute("data-mint");
      if (m) tokens.push(m);
      setState(pills[i], "is-loading");
    }
    return tokens;
  }

  async function tick() {
    var pills = document.querySelectorAll(".price-pill[data-mint]");
    if (!pills.length) return;

    var solUsd = NaN;
    try {
      solUsd = await fetchSolUsd();
    } catch (err) {}

    var screenEls = document.querySelectorAll("[data-screen-price]");

    for (var i = 0; i < pills.length; i++) {
      var token = pills[i].getAttribute("data-mint");
      var valEl = pills[i].querySelector("[data-price]");
      var kind = pills[i].getAttribute("data-kind") || "price";
      var price = NaN;
      var mcap = NaN;

      try {
        if (token === SOL_MINT) {
          price = solUsd;
        } else {
          var dex = await fetchDexTokenData(token);
          price = dex.priceUsd;
          mcap = dex.mcapUsd;
          if (!isFinite(price)) price = await fetchDexSolPairUsd(token);
        }
      } catch (err) {
        price = NaN;
        mcap = NaN;
      }

      var out = kind === "mcap" ? mcap : price;
      var formatted = kind === "mcap" ? formatCompactUsd(out) : formatUsd(out);
      if (valEl) valEl.textContent = formatted;
      setState(pills[i], isFinite(out) ? null : "is-error");

      for (var j = 0; j < screenEls.length; j++) {
        var k = screenEls[j].getAttribute("data-screen-price");
        var sk = screenEls[j].getAttribute("data-screen-kind") || "price";
        if (k === token) {
          var sout = sk === "mcap" ? mcap : price;
          screenEls[j].textContent = sk === "mcap" ? formatCompactUsd(sout) : formatUsd(sout);
        }
      }
    }
  }

  function init() {
    if (!document.getElementById("prices")) return;
    tick();
    setInterval(tick, REFRESH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

