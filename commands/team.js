const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');

const addFooter = app.addFooter;
const getTeamId = vex.getTeamId;
const validTeamId = vex.validTeamId;
const getTeam = vex.getTeam;
const createTeamEmbed = vex.createTeamEmbed;

module.exports = async (message, args) => {
	const teamId = getTeamId(message, args);
	if (validTeamId(teamId)) {
		try {
			const team = await getTeam(teamId);
			if (team) {
				const embed = createTeamEmbed(team);
				try {
					const reply = await message.channel.send({embed: embed});
					addFooter(message, embed, reply);
				} catch (err) {
					console.error(err);
				}
			} else {
				message.reply('that team ID has never been registered.').catch(console.error);
			}
		} catch (err) {
			console.error(err);
		}
	} else {
		message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
	}
};
