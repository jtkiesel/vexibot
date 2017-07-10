const Discord = require('discord.js');

module.exports = (message, args) => {
	const time = Date.now();
	const embed = new Discord.RichEmbed()
		.setColor('RANDOM')
		.setDescription('🏓 Pong!');

	message.channel.send({embed}).then(reply => {
		embed.setDescription(`${embed.description} \`${(Date.now() - time) / 1000}s\``);
		reply.edit({embed});
	}).catch(console.error);
};
