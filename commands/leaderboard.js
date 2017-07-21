const Discord = require('discord.js');

const app = require('../app');

const leaderboardChannels = ['198658074876182538', '260546095082504202', '198658294007463936', '198658294007463936', '272921946352648192', '198658419945635840', '197818075796471808', '260546551255007232'];

module.exports = (message, args) => {
	let description = '';

	app.db.collection('messages').aggregate([
		{$match: {channel: {$in: leaderboardChannels}, deleted: false}},
		{$group: {_id: '$author', count: {$sum: 1}}},
		{$sort: {count: -1}},
		{$limit: 20}
	]).forEach(user => description += `\n<@${user._id}>: \`${user.count} messages\``);

	const embed = new Discord.RichEmbed()
		.setColor('RANDOM')
		.setDescription('**Users with no lives:**');
	message.channel.send({embed}).then(reply => {
		embed.setDescription(embed.description + description);
		reply.edit({embed});
	}).catch(console.error);
};
