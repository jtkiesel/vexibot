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
			.setColor('RANDOM')
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
			.setColor('RANDOM')
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
		var body = '';

		http.request({
			host: 'api.vexdb.io',
			path: '/v1/get_teams?apikey=shNhxcphXlIXQVE2Npeu&team=' + teamId
		}, response => {
			response.on('data', chunk => {
				body += chunk;
			});
			response.on('end', () => {
				body = JSON.parse(body);

				if (body.status == 1) {
					if (body.size > 0) {
						var team = body.result[0];
						var number = team.number;
						var teamName = team.team_name;
						var robotName = team.robot_name;
						var organization = team.organisation;
						var location = [team.city, team.region, team.country].filter(String).join(', ');

						var embed = new Discord.RichEmbed()
								.setColor('BLUE')
								.setTitle(number)
								.setURL('https://vexdb.io/teams/view/' + number)
								.addField('Team Name', teamName, true);

						if (robotName) {
							embed.addField('Robot Name', robotName, true);
						} else {
							embed.addBlankField(true);
						}
						if (organization) {
							embed.addField('Organization', organization, true);
						} else {
							embed.addBlankField(true);
						}
						embed.addField('Location', location, true);

						message.channel.send({embed});
					} else {
						message.reply('That team ID has never been registered.');
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
