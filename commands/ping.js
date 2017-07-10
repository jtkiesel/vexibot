const Discord = require('discord.js');

module.exports = (message, args) => {
	const embed = new Discord.RichEmbed()
		.setColor('RANDOM')
		.setDescription('🏓 Pong!');

	message.channel.send({embed}).then(reply => {
		embed.setDescription(`${embed.description} \`${reply.client.ping / 1000}s\``);
		reply.edit({embed});
	}).catch(console.error);
};
