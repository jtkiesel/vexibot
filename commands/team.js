const Discord = require('discord.js');

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
				const embed = vex.createTeamEmbed(team);
				message.channel.send({embed: embed})
					.then(reply => app.addFooter(message, embed, reply))
					.catch(console.error);
			} else {
				message.reply('that team ID has never been registered.').catch(console.error);
			}
		}).catch(console.error);
	} else {
		message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
	}
};
