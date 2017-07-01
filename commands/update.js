const Discord = require('discord.js');
const http = require('http');
const sql = require('sqlite');

const resources = ['events', 'teams', 'matches', 'rankings', 'season_rankings', 'awards', 'skills'];

module.exports = (message, args) => {
	var embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('Updating...');
	message.channel.send({embed});

	addResourceBatchToTable(0, 0, Date.now());
};

var addResourceBatchToTable = (resourceIndex, startIndex, startTime) => {
	var body = '';
	http.request({
		host: 'api.vexdb.io',
		path: '/v1/get_' + resources[resourceIndex] + '?apikey=shNhxcphXlIXQVE2Npeu&limit_start=' + startIndex
	}, response => {
		response.on('data', chunk => {
			body += chunk;
		});
		response.on('end', () => {
console.log('end');
			body = JSON.parse(he.decode(body));
console.log(body);
			if (body.status == 1) {
				if (body.size > 0) {
console.log(body);
					for (var element of body.result) {
console.log(element);
						var row = '';
						for (var attribute in element) {
							if (row != '') {
								row += ','
							}
							row += attribute;
						}
console.log(row);
					}
				} else {
console.log('done');
				}
			} else {
				message.reply('Sorry, VexDB messed up.');
			}
		});
	}).end();
};