const fetch = require('node-fetch');
const { openseaAssetUrl } = require('../config.json');

const CacheService = require('../cache')

const ttl = 60; //cache for 60 seconds;
const cache = new CacheService(ttl);

const fetchTokenId = async () => {
  let url = `https://api.opensea.io/api/v1/assets?order_direction=desc&offset=0&limit=1&collection=${process.env.OPEN_SEA_COLLECTION_NAME}`;
  let settings = { 
    method: "GET",
    headers: {
      "X-API-KEY": process.env.OPEN_SEA_API_KEY
    }
  };

  let res = await fetch(url, settings);
  if (res.status == 404 || res.status == 400)
  {
    throw new Error("Token id doesn't exist.");
  }
  if (res.status != 200)
  {
    throw new Error(`Couldn't retrieve metadata: ${res.statusText}`);
  }

  let data = await res.json();
  
  return data.assets[0].token_id;
}

const fetchFloor = async () => {
  let tokenId = await cache.get("SampleTokenId", fetchTokenId, 0)

  let url = `${openseaAssetUrl}/${process.env.CONTRACT_ADDRESS}/${tokenId}`;
  let settings = { 
    method: "GET",
    headers: {
      "X-API-KEY": process.env.OPEN_SEA_API_KEY
    }
  };

  let res = await fetch(url, settings);
  if (res.status == 404 || res.status == 400)
  {
    throw new Error("Token id doesn't exist.");
  }
  if (res.status != 200)
  {
    throw new Error(`Couldn't retrieve metadata: ${res.statusText}`);
  }

  let metadata = await res.json();

  return Number(metadata.collection.stats.floor_price);
}

module.exports = {
	name: "floor",
	execute(message) {
    cache.get("FloorPrice", fetchFloor)
      .then((floorPrice) => {
        message.channel.send(`The current floor price is ${floorPrice.toFixed(3)}Ξ`);
      })
      .catch(error => message.channel.send(error.message));
	},
};