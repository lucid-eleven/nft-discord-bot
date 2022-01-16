require('dotenv').config()
const express = require('express')
const app = express()
const port = process.env.PORT || 5000;

const fs = require('fs');
const { prefix } = require('./config.json');
const Discord = require('discord.js');

const client = new Discord.Client();
client.commands = new Discord.Collection();
client.cronjobs = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  // set a new item in the Collection
  // with the key as the command name and the value as the exported module
  client.commands.set(command.name, command);
}

const cronFiles = fs.readdirSync('./cronjobs').filter(file => file.endsWith('.js'));
for (const file of cronFiles) {
  const job = require(`./cronjobs/${file}`);
  // set a new item in the Collection
  // with the key as the job name and the value as the exported module
  if (job.enabled) {
    console.log(`enabling ${job.description}`)
    client.cronjobs.set(job.name, job);
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.cronjobs.forEach(job => {
    setInterval(() => job.execute(client), job.interval);
  });
})

client.on('message', msg => {
  if (!msg.content.startsWith(prefix) || msg.author.bot) return;

  const args = msg.content.slice(prefix.length).trim().split(' ');
  const commandName  = args.shift().toLowerCase();

  if (!client.commands.has(commandName)) return;

  const command = client.commands.get(commandName);

  try {
    command.execute(msg, args);
  } catch (error) {
    console.error(error);
    msg.reply('there was an error trying to execute that command!');
  }
})

client.login(process.env.DISCORD_BOT_TOKEN);

app.get('/', (req, res) => {
  res.send('The bot is running')
})
  
app.listen(port, () => {
  console.log(`Discord Bot app listening at http://localhost:${port}`)
})