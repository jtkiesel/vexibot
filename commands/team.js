const Discord = require('discord.js');
const http = require('http');

module.exports = (message, args) => {
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
						}
						if (organization) {
							embed.addField('Organization', organization, true);
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
		message.reply('Invalid team ID.');
	}
};
