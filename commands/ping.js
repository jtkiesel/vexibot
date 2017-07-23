const Discord = require('discord.js');

module.exports = (message, args, embed) => {
	const time = Date.now();

	embed.setColor('RANDOM').setDescription('🏓 Pong!');
	message.channel.send({embed}).then(reply => {
		embed.setDescription(`${embed.description} \`${(Date.now() - time) / 1000}s\``);
		reply.edit({embed});
	}).catch(console.error);
};
