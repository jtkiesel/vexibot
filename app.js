var Discord = require('discord.js');

var update = require('./update');

var client = new Discord.Client();
var token = process.env.DISCORD_TOKEN;
var prefix = '^';
var commandNames = ['ping', 'uptime', 'reset', 'team', 'awards'];

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

module.exports = client;
