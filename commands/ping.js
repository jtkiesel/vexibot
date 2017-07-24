const Discord = require('discord.js');

const app = require('../app');

module.exports = (message, args) => {
	const ping = Date.now();
	const embed = new Discord.RichEmbed()
		.setColor('RANDOM')
		.setDescription('🏓 Pong!');
	message.channel.send({embed}).then(reply => {
		embed.setDescription(`${embed.description} \`${(Date.now() - ping) / 1000}s\``);
		reply.edit({embed})
			.then(reply => app.addFooter(message, embed, reply))
			.catch(console.error);
	}).catch(console.error);
};
