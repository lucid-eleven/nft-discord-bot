const fetch = require('node-fetch');
const { openseaAssetUrl } = require('../config.json');

const CacheService = require('../cache')

const ttl = 60; //cache for 60 seconds;
const cache = new CacheService(ttl);

const fetchFloor = async () => {
  let url = `https://api.opensea.io/api/v1/collection/${process.env.osCollectionName}/stats`
  let settings = { 
    method: "GET",
    headers: process.env.apiKey == null ? {} : {
      "X-API-KEY": process.env.apiKey
    }
  };

  let res = await fetch(url, settings);
  if (res.status == 404 || res.status == 400)
  {
    throw new Error("Error retrieving collection stats.");
  }
  if (res.status != 200)
  {
    throw new Error(`Couldn't retrieve metadata: ${res.statusText}`);
  }

  let data = await res.json();

  return Number(data.stats.floor_price);
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
