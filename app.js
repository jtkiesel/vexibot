const Discord = require('discord.js');
const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;

const prefix = '^';

client.on('ready', () => {
	console.log('I am ready!');
});

client.on('message', message => {
	var content = message.content.split(prefix, 1);
	console.log('content: ' + content);
	if (content[0] == prefix) {
		handleCommand(message, content[1]);
	}
});

function handleCommand(message, command) {
	var cmd = command.split(' ', 1);
	console.log('cmd: ' + cmd);
	switch (cmd[0]) {
		case 'ping':
			cmdPing(message, cmd[1]);
			break;

		default:
			message.reply('Unrecognized command.');
			break;
	}
}

function cmdPing(message, arguments) {
	const embed = new Discord.RichEmbed()
			.setColor(Math.floor(Math.random() * 16777216))
			.setDescription('🏓 Pong!');
	message.channel.send({embed})
			.then(msg => msg.edit(embed.setDescription(embed.description + ' ' + (message.createdTimestamp - msg.createdTimestamp) + 'ms')))
			.catch(console.error);
}

client.login(token);