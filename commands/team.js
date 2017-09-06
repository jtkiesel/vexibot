const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');

const addFooter = app.addFooter;
const getTeamId = vex.getTeamId;
const validTeamId = vex.validTeamId;
const getTeam = vex.getTeam;
const createTeamEmbed = vex.createTeamEmbed;

module.exports = (message, args) => {
	const teamId = getTeamId(message, args);
	if (validTeamId(teamId)) {
		getTeam(teamId).then(team => {
			if (team) {
				const embed = createTeamEmbed(team);
				message.channel.send({embed: embed})
					.then(reply => addFooter(message, embed, reply))
					.catch(console.error);
			} else {
				message.reply('that team ID has never been registered.').catch(console.error);
			}
		}).catch(console.error);
	} else {
		message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
	}
};
