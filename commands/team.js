const Discord = require('discord.js');
const he = require('he');

const app = require('../app');
const vex = require('../vex');

const db = app.db;

module.exports = (message, args) => {
	const teamId = vex.getTeamId(message, args);
	if (vex.validTeamId(teamId)) {
		vex.getTeam(teamId).then(team => {
			if (team) {
				const name = he.decode(team.name);
				const robot = he.decode(team.robot);

				let location = [team.city];
				if (team.region && team.region != 'N/A' && team.region != 'Not Applicable or Not Listed') {
					location.push(team.region);
				}
				db.collection('teams').findOne({_id: team._id.id}).then(team2 => {
					let org;
					if (team2) {
						if (team2.org) {
							org = he.decode(team2.org);
						}
						if (team2.country) {
							location.push(team2.country);
						}
					}
					location = location.join(', ');

					const embed = new Discord.RichEmbed()
						.setColor('GREEN')
						.setTitle(team._id.id)
						.setURL(`https://vexdb.io/teams/view/${team._id.id}`)
						.addField('Team Name', name, true);
					if (robot) {
						embed.addField('Robot Name', robot, true);
					}
					if (org) {
						embed.addField('Organization', org, true);
					}
					embed.addField('Location', location, true);
					message.channel.send({embed})
						.then(reply => app.addFooter(message, embed, reply))
						.catch(console.error);
				}).catch(console.error);
			} else {
				message.reply('That team ID has never been registered.').catch(console.error);
			}
		}).catch(console.error);
	} else {
		message.reply('Please provide a valid team ID.').catch(console.error);
	}
};
