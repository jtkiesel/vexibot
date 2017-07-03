const Discord = require('discord.js');

const update = require('./update');

const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;
const prefix = '^';
const commandInfo = {
	'ping': 'Pong!',
	'uptime': 'Time since bot last restarted.',
	'reset': 'Reset all data from VexDB.',
	'team': 'Get general information about a VEX team.',
	'awards': 'Get awards received by a VEX team.'
};

var commands = {};
Object.keys(commandInfo).forEach(name => commands[name] = require('./commands/' + name));

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

	if (commands.hasOwnProperty(cmd)) {
		commands[cmd](message, args);
	} else {
		message.reply('Unrecognized command.');
	}
}

module.exports.client = client;
