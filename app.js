var Discord = require('discord.js');
var http = require('http');

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

		default:
			message.reply('Unrecognized command.');
			break;
	}
}

var cmdPing = (message, args) => {
	var embed = new Discord.RichEmbed()
			.setColor(Math.floor(Math.random() * 16777216))
			.setDescription('🏓 Pong!');

	message.channel.send({embed})
			.then(reply => {
				embed.setDescription(embed.description + ' `' + client.ping + 'ms`');
				reply.edit({embed});
			}).catch(console.error);
}

var cmdUptime = (message, args) => {
	var milliseconds = new Date(client.uptime);

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
	var embed = new Discord.RichEmbed()
			.setColor(Math.floor(Math.random() * 16777216))
			.setDescription(uptime.join(', '));

	message.channel.send({embed});
}

var cmdTeam = (message, args) => {
	var teamId;

	if (args) {
		teamId = args.trim().toUpperCase();
	} else {
		teamId = message.member.nickname.split(' | ', 2)[1];
	}
	if (/^([0-9]{1,5}[A-Z]?|[A-Z]{2,6}[0-9]{0,2})$/.test(teamId)) {
		var body;

		http.request({
			host: 'http://api.vexdb.io',
			path: '/v1/get_teams?team=' + teamId
		}, response => {
			response.on('data', chunk => {
				body += chunk;
			});
			response.on('end', () => {
				body = JSON.parse(body);
				console.log('body: ' + body);
				if (body.status == 1) {
					if (body.size > 0) {
						var team = body.result[0];
						var embed;
					} else {
						message.reply('That team is not registered.');
					}
				} else {
					message.reply('Sorry, VexDB messed up.');
				}
			});
		}).end();
	} else {
		message.reply('Invalid team ID.')
	}
}

var formatTime = (time, unit) => time + ' ' + unit + ((time == 1) ? '' : 's');

client.login(token);
