const Discord = require('discord.js');
const he = require('he');

const app = require('../app');
const vex = require('../vex');
const dbinfo = require('../dbinfo');

const db = app.db;
const grades = dbinfo.grades;

module.exports = (message, args) => {
	const teamId = vex.getTeamId(message, args);
	if (vex.validTeamId(teamId)) {
		vex.getTeam(teamId).then(team => {
			if (team) {
				const name = he.decode(team.name);
				const robot = team.robot ? he.decode(team.robot) : '';
				const org = team.org ? he.decode(team.org) : '';
				const grade = team.grade ? grades[team.grade] : '';
				const registered = team.registered ? 'Yes' : 'No';

				let location = [team.city];
				if (team.region) {
					location.push(team.region);
				}
				if (team.country) {
					location.push(team.country);
				}
				location = location.join(', ');

				const embed = new Discord.RichEmbed()
					.setColor('GREEN')
					.setTitle(teamId)
					.setURL(`https://vexdb.io/teams/view/${teamId}`)
					.addField('Team Name', name, true);
				if (robot) {
					embed.addField('Robot Name', robot, true);
				}
				if (org) {
					embed.addField('Organization', org, true);
				}
				embed.addField('Location', location, true);
				if (grade) {
					embed.addField('Grade', grade, true);
				}
				embed.addField('Registered?', registered, true);
				message.channel.send({embed})
					.then(reply => app.addFooter(message, embed, reply))
					.catch(console.error);
			} else {
				message.reply('That team ID has never been registered.').catch(console.error);
			}
		}).catch(console.error);
	} else {
		message.reply('Please provide a valid team ID.').catch(console.error);
	}
};
