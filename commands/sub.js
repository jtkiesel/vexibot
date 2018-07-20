const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');
const dbinfo = require('../dbinfo');

const db = app.db;
const addFooter = app.addFooter;

const yes = '✅';
const no = '❎';

module.exports = async (message, args) => {
	const teamId = vex.getTeamId(message, args);
	if (message.guild) {
		if (vex.validTeamId(teamId)) {
			try {
				let team = await vex.getTeam(teamId);
				team = team[0];
				const prog = team ? team._id.prog : isNaN(teamId.charAt(0)) ? 4 : 1;
				const id = team ? team._id.id : teamId;
				const teamString = `${dbinfo.decodeProgram(prog)} ${id}`;
				const teamSub = {
					_id: {
						guild: message.guild.id,
						team: {
							prog: prog,
							id: id
						}
					}
				};
				const cancel = await db.collection('teamSubs').findOne({_id: teamSub._id, users: message.author.id}) ? `you are already subscribed to updates for ${teamString}, would you like to cancel your subscription?` : '';
				let reply;
				if (team) {
					reply = await message.reply(cancel || `subscribe to updates for ${teamString}?`, {embed: vex.createTeamEmbed(team)});
				} else {
					reply = await message.reply(cancel || `that team ID has never been registered, are you sure you want to subscribe to updates for ${teamString}?`);
				}
				const collector = reply.createReactionCollector((reaction, user) => {
					return user.id === message.author.id && (reaction.emoji.name === yes || reaction.emoji.name === no);
				}, {max: 1, time: 30000});
				collector.on('end', async (collected, reason) => {
					let status;
					if (collected.get(yes)) {
						if (!cancel) {
							status = 'are now';
							await db.collection('teamSubs').findOneAndUpdate({_id: teamSub._id}, {$set: teamSub, $addToSet: {users: message.author.id}}, {upsert: true});
						} else {
							status = 'are no longer';
							await db.collection('teamSubs').findOneAndUpdate({_id: teamSub._id}, {$set: teamSub, $pull: {users: message.author.id}});
						}
					} else {
						status = cancel ? 'are still' : 'have not been';
					}
					let users = reply.reactions.get(yes).users;
					users.forEach(user => users.remove(user));
					users = reply.reactions.get(no).users;
					users.forEach(user => users.remove(user));
					reply.edit(`${message.author}, you ${status} subscribed to updates for ${teamString}.`, {embed: null});
				});
				await reply.react(yes);
				await reply.react(no);
			} catch (err) {
				console.error(err);
			}
		} else {
			message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
		}
	}
};
