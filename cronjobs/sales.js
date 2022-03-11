const fetch = require('node-fetch');
const Discord = require('discord.js');
const { openseaEventsUrl } = require('../config.json');

var salesCache = [];
var lastTimestamp = null;

module.exports = {
  name: 'sales',
  description: 'sales bot',
  interval: 30000,
  enabled: process.env.DISCORD_SALES_CHANNEL_ID != null,
  async execute(client) {
    if (lastTimestamp == null) {
      lastTimestamp = Math.floor(Date.now() / 1000) - 120;
    } else {
      lastTimestamp -= 30;
    }
    let newTimestamp = Math.floor(Date.now() / 1000) - 30;

    let next = null;
    let newEvents = true;
    let settings = {
      method: "GET",
      headers: process.env.OPEN_SEA_API_KEY == null ? {} : {
        "X-API-KEY": process.env.OPEN_SEA_API_KEY
      }
    };
    do {
      let url = `${openseaEventsUrl}?collection_slug=${process.env.OPEN_SEA_COLLECTION_NAME}&event_type=successful&only_opensea=false&occurred_before=${newTimestamp}${next == null ? '' : `&cursor=${next}`}`;
      try {
        var res = await fetch(url, settings);
        if (res.status != 200) {
          throw new Error(`Couldn't retrieve events: ${res.statusText}`);
        }

        let data = await res.json();

        next = data.next;

        data.asset_events.forEach(function (event) {
          if (event.asset) {
            if (salesCache.includes(event.id)) {
              newEvents = false;
              return;
            } else {
              salesCache.push(event.id);
              if (salesCache.length > 200) salesCache.shift();
            }

            if ((+new Date(event.created_date) / 1000) < lastTimestamp) {
              newEvents = false;
              return;
            }

            const embedMsg = new Discord.MessageEmbed()
              .setColor('#0099ff')
              .setTitle(event.asset.name)
              .setURL(event.asset.permalink)
              .setDescription(`has just been sold for ${event.total_price / (1e18)}\u039E`)
              .setThumbnail(event.asset.image_url)
              .addField("From", `[${event.seller.user?.username || event.seller.address.slice(0, 8)}](https://etherscan.io/address/${event.seller.address})`, true)
              .addField("To", `[${event.winner_account.user?.username || event.winner_account.address.slice(0, 8)}](https://etherscan.io/address/${event.winner_account.address})`, true);

            client.channels.fetch(process.env.DISCORD_SALES_CHANNEL_ID)
              .then(channel => {
                channel.send(embedMsg);
              })
              .catch(console.error);
          }
        });
      }
      catch (error) {
        console.error(error);
        return;
      }
    } while (next != null && newEvents)

    lastTimestamp = newTimestamp;
  }
};
