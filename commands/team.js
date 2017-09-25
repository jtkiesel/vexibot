const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');

const addFooter = app.addFooter;
const getTeamId = vex.getTeamId;
const validTeamId = vex.validTeamId;
const getTeam = vex.getTeam;
const createTeamEmbed = vex.createTeamEmbed;

const previous = '\u25C0';
const next = '\u25B6';

const dynamicTeamEmbed = async (message, team, index = 0, reply, end) => {
	if (index >= team.length) {
		index = 0;
	} else if (index < 0) {
		index = team.length - 1;
	}
	const embed = createTeamEmbed(team[index]);
	let time;
	try {
		if (!reply) {
			reply = await message.channel.send({embed: embed});
			await reply.react(previous);
			await reply.react(next);
			time = 30000;
			end = Date.now() + time;
		} else {
			reply = await reply.edit({embed: embed});
			time = end - Date.now();
		}
		const reactions = await reply.awaitReactions((reaction, user) => user.id === message.author.id && (reaction.emoji.name === previous || reaction.emoji.name === next), {max: 1, time: time});
		if (reactions.size) {
			index += (reactions.get(next) ? 1 : -1);
			dynamicTeamEmbed(message, team, index, reply, end);
		} else {
			reply.clearReactions();
			addFooter(message, embed, reply);
		}
	} catch (err) {
		console.error(err);
	}
};

module.exports = async (message, args) => {
	const teamId = getTeamId(message, args);
	if (validTeamId(teamId)) {
		try {
			const team = await getTeam(teamId);
			if (team.length) {
				dynamicTeamEmbed(message, team);
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
