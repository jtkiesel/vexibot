const Discord = require('discord.js');

const update = require('./update');

const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;
const prefix = '^';
const commandNames = ['ping', 'uptime', 'reset', 'team', 'awards'];

var commands = {};
for (var name of commandNames) {
	commands[name] = require('./commands/' + name);
}

client.on('ready', () => {
	console.log('I am ready!');
});

client.on('message', message => {
	if (message.content.startsWith(prefix)) {
		handleCommand(message);
	}
});

client.login(token);

var handleCommand = message => {
	var [cmd, args] = message.content.substring(prefix.length).split(' ', 2);

	if (commandNames.includes(cmd)) {
		commands[cmd](message, args);
	} else {
		message.reply('Unrecognized command.');
	}
}

module.exports.client = client;
