const Discord = require('discord.js');
const db = require('sqlite');
const he = require('he');

const vex = require('../vex');

module.exports = (message, args) => {
	/*var teamId;
	if (args) {
		teamId = args.trim().toUpperCase();
	} else {
		teamId = message.member.nickname.split(' | ', 2)[1];
	}
	if (/^([0-9]{1,5}[A-Z]?|[A-Z]{2,6}[0-9]{0,2})$/.test(teamId)) {
		db.get(`SELECT * FROM teams WHERE number = ?`, teamId)
			.then(team => {
				if (team) {*/
	vex.getTeam(message, args).then(team => {
		if (team) {
			var team_name = he.decode(team.team_name);
			var robot_name = he.decode(team.robot_name);
			var organisation = he.decode(team.organisation);
			var location = [team.city];
			if (team.region && team.region !== 'N/A' && team.region !== 'Not Applicable or Not Listed') {
				location.push(team.region);
			}
			if (team.country) {
				location.push(team.country);
			}
			location = location.join(', ');

			var embed = new Discord.RichEmbed()
				.setColor('AQUA')
				.setTitle(team.number)
				.setURL(`https://vexdb.io/teams/view/${team.number}`)
				.addField('Team Name', team_name, true);

			if (robot_name) {
				embed.addField('Robot Name', robot_name, true);
			}
			if (organisation) {
				embed.addField('Organization', organisation, true);
			}
			embed.addField('Location', location, true);

			message.channel.send({embed});
		}
	}).catch(console.error);
				/*} else {
					message.reply('That team ID has never been registered.');
				}
			}).catch(error => {
				console.log(`SELECT * FROM teams WHERE number = '${teamId}'`);
				console.error(error);
			});
	} else {
		message.reply('Please provide a valid team ID.');
	}*/
};
