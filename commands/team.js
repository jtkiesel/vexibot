const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');

const client = app.client;
const addFooter = app.addFooter;
const getTeamId = vex.getTeamId;
const validTeamId = vex.validTeamId;
const getTeam = vex.getTeam;
const createTeamEmbed = vex.createTeamEmbed;

const previous = '\u25C0';
const next = '\u25B6';

module.exports = async (message, args) => {
	const arg = args ? args.replace(/\s+/g, '') : '';
	const teamId = getTeamId(message, arg);
	if (validTeamId(teamId)) {
		try {
			const team = await getTeam(teamId);
			if (team.length) {
				let index = 0;
				const embed = createTeamEmbed(team[index]);

				try {
					const reply = await message.channel.send({embed: embed});
					const collector = reply.createReactionCollector((reaction, user) => {
						return user.id !== client.user.id && (reaction.emoji.name === previous || reaction.emoji.name === next);
					}, {time: 30000, dispose: true});
					collector.on('collect', (reaction, user) => {
						if (user.id === message.author.id) {
							index += (reaction.emoji.name === next ? -1 : 1);
							if (index >= team.length) {
								index = 0;
							} else if (index < 0) {
								index = team.length - 1;
							}
							reply.edit({embed: createTeamEmbed(team[index])});
						} else {
							reaction.users.remove(user);
						}
					});
					collector.on('remove', (reaction, user) => {
						if (user.id === message.author.id) {
							index += (reaction.emoji.name === next ? -1 : 1);
							if (index >= team.length) {
								index = 0;
							} else if (index < 0) {
								index = team.length - 1;
							}
							reply.edit({embed: createTeamEmbed(team[index])});
						}
					});
					collector.on('end', (collected, reason) => {
						[previous, next].forEach(emoji => {
							const reaction = reply.reactions.get(emoji);
							if (reaction) {
								const users = reaction.users;
								users.forEach(user => users.remove(user));
							}
						});
						addFooter(message, embed, reply);
					});
					await reply.react(previous);
					await reply.react(next);
				} catch (err) {
					console.log(err);
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
