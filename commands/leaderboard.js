const Discord = require('discord.js');
const db = require('sqlite');

module.exports = (message, args) => {
	db.all('SELECT * FROM messages ORDER BY count DESC LIMIT 20').then(rows => {
		const embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('Users with no lives:');
		message.channel.send({embed}).then(reply => {
			let description = embed.description;
			rows.forEach(row => description += `\n<@${row.user}>: \`${row.count} messages\``);
			embed.setDescription(description);
			reply.edit({embed});
		}).catch(console.error);
	}).catch(error => {
		console.log('SELECT * FROM messages ORDER BY count DESC LIMIT 20');
		console.error(error);
	});
};
