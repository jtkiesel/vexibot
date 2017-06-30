const Discord = require('discord.js');
const http = require('http');
const sql = require('sqlite');

var commandNames = ['ping', 'uptime', 'update', 'team', 'awards'];
var commands = {};
for (var name of commandNames) {
	commands[name] = require('./commands/' + name);
}
/*
var cmdPing = require('./commands/ping');
var cmdUptime = require('./commands/uptime');
var cmdUpdate = require('./commands/update');
var cmdTeam = require('./commands/team');
var cmdAwards = require('./commands/awards');
*/
const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;
const prefix = '^';

sql.open('./vexdb.sqlite');

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

	commands[cmd](message, args);
/*
	switch (cmd) {
		case 'ping':
			cmdPing(message, args);
			break;

		case 'uptime':
			cmdUptime(message, args);
			break;

		case 'update':
			cmdUpdate(message, args);

		case 'team':
			cmdTeam(message, args);
			break;

		case 'awards':
			cmdAwards(message, args);

		default:
			message.reply('Unrecognized command.');
			break;
	}
*/
}
