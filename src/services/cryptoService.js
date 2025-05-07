const axios = require('axios');
const NodeCache = require('node-cache');

const priceCache = new NodeCache({ stdTTL: 10 });

const fetchCryptoPrice = async (currency) => {
  const cacheKey = `${currency}_usd`;
  const cachedPrice = priceCache.get(cacheKey);
  if (cachedPrice) return cachedPrice;

  try {
    const response = await axios.get(
      `${process.env.COINGECKO_API_URL}/simple/price`,
      {
        params: {
          ids: currency === 'BTC' ? 'bitcoin' : 'ethereum',
          vs_currencies: 'usd'
        }
      }
    );
    const price = response.data[currency === 'BTC' ? 'bitcoin' : 'ethereum'].usd;
    priceCache.set(cacheKey, price);
    return price;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw new Error('Failed to fetch crypto price');
  }
};

const convertUsdToCrypto = async (usdAmount, currency) => {
  const price = await fetchCryptoPrice(currency);
  const cryptoAmount = usdAmount / price;
  return { cryptoAmount, price };
};

const convertCryptoToUsd = async (cryptoAmount, currency) => {
  const price = await fetchCryptoPrice(currency);
  return cryptoAmount * price;
};

module.exports = { fetchCryptoPrice, convertUsdToCrypto, convertCryptoToUsd };