const Discord = require('discord.js');
const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;

const prefix = '^';

client.on('ready', () => {
	console.log('I am ready!');
});

client.on('message', message => {
	if (message.content.startsWith(prefix)) {
		handleCommand(message);
	}
});

var handleCommand = message => {
	const [cmd, args] = message.content.substring(prefix.length).split(' ', 2);
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

		default:
			message.reply('Unrecognized command.');
			break;
	}
}

var cmdPing = (message, args) => {
	const embed = new Discord.RichEmbed()
			.setColor(Math.floor(Math.random() * 16777216))
			.setDescription('🏓 Pong!');
	message.channel.send({embed})
			.then(reply => {
				embed.setDescription(embed.description + ' `' + client.ping + 'ms`');
				reply.edit({embed});
			}).catch(console.error);
}

var cmdUptime = (message, args) => {
	const milliseconds = new Date(client.uptime);

	var seconds = Math.floor(milliseconds / 1000);
	var minutes = Math.floor(seconds / 60);
	var hours = Math.floor(minutes / 60);
	var days = Math.floor(hours / 24);

	seconds %= 60;
	minutes %= 60;
	hours %= 24;

	var uptime = [];
	if (days > 0) {
		uptime.push(formatTime(days, 'day'));
	}
	if (hours > 0) {
		uptime.push(formatTime(hours, 'hour'));
	}
	if (minutes > 0) {
		uptime.push(formatTime(minutes, 'minute'));
	}
	if (seconds > 0) {
		uptime.push(formatTime(seconds, 'second'));
	}
	const embed = new Discord.RichEmbed()
			.setColor(Math.floor(Math.random() * 16777216))
			.setDescription(uptime.join(', '));

	message.channel.send({embed});
}

var cmdTeam = (message, args) => {
	var team;
	console.log(args);
	if (args) {
		team = args.trim().toUpper();
	} else {
		team = message.member.nickname;
	}
	console.log(team);
}

var formatTime = (time, unit) => time + ' ' + unit + ((time == 1) ? '' : 's');

client.login(token);