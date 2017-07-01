const Discord = require('discord.js');
const http = require('http');
const he = require('he');
const sql = require('sqlite');

const resources = ['events', 'teams', 'matches', 'rankings', 'season_rankings', 'awards', 'skills'];

module.exports = (message, args) => {
	var embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('Updating...');
	message.channel.send({embed})
			.then(reply => addResourceBatchToTable(0, 0, embed, reply, Date.now()))
			.catch(console.error);
};

var addResourceBatchToTable = (resourceIndex, startIndex, embed, reply, startTime) => {
	const resource = resources[resourceIndex];

	var body = '';
	http.request({
		host: 'api.vexdb.io',
		path: '/v1/get_' + resource + '?apikey=shNhxcphXlIXQVE2Npeu&limit_start=' + startIndex
	}, response => {
		response.on('data', chunk => {
			body += chunk;
		});
		response.on('end', () => {
			body = JSON.parse(body);

			if (body.status == 1) {
				if (body.size > 0) {
					for (var element of body.result) {
						console.log(element);
						//sql.run('INSERT INTO ' + resource + ' VALUES ', element);
					}
					addResourceBatchToTable(resourceIndex, startIndex + body.size, embed, reply, startTime);
				} else {
					var duration = (Date.now() - startTime) / 1000;
					embed.setDescription(embed.description + '\n' + resource + ' `' + duration + 's`');
					reply.edit({embed})
							.then(msg => addResourceBatchToTable(resourceIndex + 1, 0, embed, msg, Date.now()))
							.catch(console.error);
				}
			} else {
				message.reply('Sorry, VexDB messed up.');
			}
		});
	}).end();
};
