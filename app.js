var Discord = require('discord');
var http = require('http');

var cmdPing = require('./commands/ping');
var cmdUptime = require('./commands/uptime');
var cmdTeam = require('./commands/team');
var cmdAwards = require('./commands/awards');

var client = new Discord.Client();
var token = process.env.DISCORD_TOKEN;
var prefix = '^';

client.on('ready', () => {
	console.log('I am ready!');
});

client.on('message', message => {
	if (message.content.startsWith(prefix)) {
		handleCommand(message);
	}
});

var handleCommand = message => {
	var [cmd, args] = message.content.substring(prefix.length).split(' ', 2);

	switch (cmd) {
		case 'ping':
			cmdPing(message, args);
			break;

		case 'uptime':
			cmdUptime(message, args);
			break;

		case 'team':
			cmdTeam(message, args);
			break;

		case 'awards':
			cmdAwards(message, args);

		default:
			message.reply('Unrecognized command.');
			break;
	}
}

client.login(token);
