const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');
const dbinfo = require('../dbinfo');

const db = app.db;
const addFooter = app.addFooter;
const getTeamId = vex.getTeamId;
const validTeamId = vex.validTeamId;
const getTeam = vex.getTeam;
const createTeamEmbed = vex.createTeamEmbed;
const decodeProgram = dbinfo.decodeProgram;

const yes = '✅';
const no = '❎';

module.exports = async (message, args) => {
	const teamId = getTeamId(message, args);
	if (message.guild) {
		if (validTeamId(teamId)) {
			try {
				const team = await getTeam(teamId);
				let prog, id;
				let reply;
				if (team) {
					prog = team._id.prog;
					id = team._id.id;
					reply = await message.reply(`subscribe to updates for **${decodeProgram(prog)} ${id}**? (Select ${yes} or ${no}.)`, {embed: createTeamEmbed(team)});
				} else {
					prog = isNaN(teamId.charAt(0)) ? 4 : 1;
					id = teamId;
					reply = await message.reply(`that team ID has never been registered, are you sure you want to subscribe to updates for ${decodeProgram(prog)} ${id}? (Select ${yes} or ${no}.)`);
				}
				await reply.react(yes);
				await reply.react(no);
				const reactions = await reply.awaitReactions((reaction, user) => user.id === message.author.id && (reaction.emoji.name === yes || reaction.emoji.name === no), {max: 1, time: 30000});
				let text;
				if (reactions.get(yes)) {
					const teamSub = {
						_id: {
							guild: message.guild.id,
							team: {
								prog: prog,
								id: id
							}
						}
					};
					await db.collection('teamSubs').findOneAndUpdate({_id: teamSub._id}, {$set: teamSub, $addToSet: {users: message.author.id}}, {upsert: true});
					text = `you are now subscribed to updates for **${decodeProgram(prog)} ${id}**!`;
				} else {
					text = `your subscription request for **${decodeProgram(prog)} ${id}** has been canceled.`;
				}
				reply = await reply.clearReactions();
				reply.edit(`${message.author}, ${text}`, {embed: null});
			} catch (err) {
				console.error(err);
			}
		} else {
			message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
		}
	}
};
