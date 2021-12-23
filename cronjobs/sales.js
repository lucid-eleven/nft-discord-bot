const fetch = require('node-fetch');
const Discord = require('discord.js');
const { openseaEventsUrl } = require('../config.json');

var salesCache = [];
var lastTimestamp = null;

module.exports = {
  name: 'sales',
  description: 'sales bot',
  interval: 30000,
  enabled: process.env.salesChannelID != null,
  async execute(client) {
    if (lastTimestamp == null) {
      lastTimestamp = Math.floor(Date.now()/1000) - 120;
    } else {
      lastTimestamp -= 30;
    }
    let newTimestamp = Math.floor(Date.now()/1000) - 30;
    // we're retrieving events from -90 to -30 seconds ago each time, and each query overlaps the previous query by 30 seconds
    // doing this to try to resolve some intermittent issues with events being missed by the bot, suspect it's due to OpenSea api being slow to update the events data
    // duplicate events are filtered out by the salesCache array

    let offset = 0;
    let settings = { 
      method: "GET",
      headers: process.env.apiKey == null ? {} : {
        "X-API-KEY": process.env.apiKey
      }
    };
    while(1)
    {
      let url = `${openseaEventsUrl}?collection_slug=${process.env.osCollectionName}&event_type=successful&only_opensea=false&offset=${offset}&limit=50&occurred_after=${lastTimestamp}&occurred_before=${newTimestamp}`;
      try {
        var res = await fetch(url, settings);
        if (res.status != 200) {
          throw new Error(`Couldn't retrieve events: ${res.statusText}`);
        }

        let data = await res.json();
        if (data.asset_events.length == 0) {
          break;
        }

        data.asset_events.forEach(function(event) {
          if (event.asset) {
            if (salesCache.includes(event.id)) {
              return;
            } else {
              salesCache.push(event.id);
              if (salesCache.length > 200) salesCache.shift();
            }

            const embedMsg = new Discord.MessageEmbed()
              .setColor('#0099ff')
              .setTitle(event.asset.name)
              .setURL(event.asset.permalink)
              .setDescription(`has just been sold for ${event.total_price/(1e18)}\u039E`)
              .setThumbnail(event.asset.image_url)
              .addField("From", `[${event.seller.user?.username || event.seller.address.slice(0,8)}](https://etherscan.io/address/${event.seller.address})`, true)
              .addField("To", `[${event.winner_account.user?.username || event.winner_account.address.slice(0,8)}](https://etherscan.io/address/${event.winner_account.address})`, true);

            client.channels.fetch(process.env.salesChannelID)
              .then(channel => {
                channel.send(embedMsg);
              })
              .catch(console.error);
          }
        });

        offset += data.asset_events.length;
      }
      catch (error) {
        console.error(error);
        return;
      }
    }

    lastTimestamp = newTimestamp;
  }
};
