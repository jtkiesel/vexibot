const Discord = require('discord.js');
const db = require('sqlite');

const app = require('../app');

let channels = [];
let messageCounts = {};
let users = [];

module.exports = (message, args) => {
	if (message.author.id == '197781934116569088') {
		const embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('Fetching messages...');

		channels = [];
		message.guild.channels.forEach(channel => {
			if (channel.type == 'text' && channel.permissionsFor(app.client.user).has('READ_MESSAGES')
					&& channel.id != '322207561703227422') {
				channels.push(channel);
			}
		});
		messageCounts = {};
		message.channel.send({embed})
			.then(reply => addChannelToTable(0, embed, reply))
			.catch(console.error);
	} else {
		message.reply('You do not have permission to run that command.');
	}
};

const addChannelToTable = (channelIndex, embed, reply) => {
	addChannelBatchToTable(channelIndex, '', embed, reply, Date.now());
};

const addChannelBatchToTable = (channelIndex, lastMessageId, embed, reply, startTime) => {
	const channel = channels[channelIndex];

	let options = {limit: 100};
	if (lastMessageId) {
		options.before = lastMessageId;
	}
	channel.fetchMessages(options).then(messages => {
		if (messages.size) {
			messages.forEach(message => {
				let id = message.author.id;
				if (!messageCounts.hasOwnProperty(id)) {
					messageCounts[id] = 1;
				} else {
					messageCounts[id]++;
				}
			});
			addChannelBatchToTable(channelIndex, messages.lastKey(), embed, reply, startTime);
		} else {
			const duration = (Date.now() - startTime) / 1000;

			embed.setColor('RANDOM')
				.setDescription(`${embed.description}\n${channel} \`${duration}s\``);
			reply.edit({embed}).then(msg => {
				if (++channelIndex < channels.length) {
					addChannelToTable(channelIndex, embed, reply);
				} else {
					users = Object.keys(messageCounts);
					db.run('DELETE FROM messages')
						.then(() => addMessagesToTable(0, embed, reply))
						.catch(error => {
							console.log('DELETE FROM messages');
							console.error(error);
						});
				}
			}).catch(console.error);
		}
	}).catch(error => {
		console.error(error);
		addChannelBatchToTable(channelIndex, lastMessageId, embed, reply, startTime);
	});
};

const addMessagesToTable = (index, embed, reply) => {
	let id = users[index];
	db.run('INSERT INTO messages (user, count) VALUES (?, ?)', [id, messageCounts[id]]).then(() => {
		if (index < users.length) {
			addMessagesToTable(index + 1, embed, reply);
		} else {
			embed.setDescription(`${embed.description}\nDone!`);
			reply.edit({embed});
		}
	}).catch(error => {
		console.log(`INSERT INTO messages (user, count) VALUES (${id}, ${count})`);
		console.error(error);
	});
};
