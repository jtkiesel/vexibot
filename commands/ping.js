module.exports = (message, args) => {
	var embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('🏓 Pong!');

	message.channel.send({embed})
			.then(reply => {
				embed.setDescription(embed.description + ' `' + client.ping + 'ms`');
				reply.edit({embed});
			}).catch(console.error);
};
