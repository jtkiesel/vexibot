module.exports = (message, args) => {
	var embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('🏓 Pong!');

	message.channel.send({embed})
			.then(reply => {
				embed.setDescription(embed.description + ' `' + (client.ping / 1000) + 's`');
				reply.edit({embed});
			}).catch(console.error);
};
