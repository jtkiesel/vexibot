const Discord = require('discord.js');
const db = require('sqlite');

let channels;

module.exports = (message, args) => {
	if (message.author.id == '197781934116569088') {
		db.run('DELETE FROM messages').then(() => {
			const embed = new Discord.RichEmbed()
				.setColor('RANDOM')
				.setDescription('Fetching messages...');

			channels = [];
			message.guild.channels.forEach(channel => {
				if (channel.type == 'text') {
					channels.push(channel);
				}
			});
			message.channel.send({embed})
				.then(reply => addChannelToTable(0, embed, reply))
				.catch(console.error);
		}).catch(error => {
			console.log('DELETE FROM messages');
			console.error(error);
		});
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
			messages = Array.from(messages.values());
			addMessagesToTable(messages, channelIndex, embed, reply, startTime);
		} else {
			const duration = (Date.now() - startTime) / 1000;
			embed.setColor('RANDOM')
				.setDescription(`${embed.description}\n${channel} \`${duration}s\``);
			reply.edit({embed}).then(msg => {
				if (++channelIndex < channels.length) {
					addChannelToTable(channelIndex, embed, msg);
				}
			}).catch(console.error);
		}
	}).catch(console.error);
};

const addMessagesToTable = (messages, channelIndex, embed, reply, startTime) => {
	message = messages.shift();
	db.get('SELECT count FROM messages WHERE user = ?', [message.author.id]).then(row => {
		let query, values;
		if (!row) {
			query = 'INSERT INTO messages (user, count) VALUES (?, ?)';
			values = [message.author.id, 1];
		} else {
			query = 'UPDATE messages SET count = ? WHERE user = ?';
			values = [row.count + 1, message.author.id];
		}
		db.run(query, values).then(() => {
			if (messages.length) {
				addMessagesToTable(messages, channelIndex, embed, reply, startTime);
			} else {
				addChannelBatchToTable(channelIndex, message.id, embed, reply, startTime);
			}
		}).catch(error => {
			console.log(`${query}, [${values.join(', ')}]`);
			console.error(error);
		});
	}).catch(error => {
		console.log(`SELECT count FROM messages WHERE user = ${message.author.id}`);
		console.error(error);
	});
};
