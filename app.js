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
let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;
Object.entries(commandInfo).forEach(([name, desc]) => {
	helpDescription += `\n\`${prefix}${name}\`: ${desc}`;
});

let commands = {};
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

let handleCommand = message => {
	const [cmd, args] = message.content.substring(prefix.length).split(' ', 2);

	if (commands.hasOwnProperty(cmd)) {
		commands[cmd](message, args);
	} else if (cmd == 'help') {
		const embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setTitle('Commands')
			.setDescription(helpDescription);
		message.channel.send({embed});
	} else {
		message.reply('Unrecognized command.');
	}
}

module.exports.client = client;
