const Discord = require('discord.js');
const http = require('http');
const he = require('he');
const db = require('sqlite');

const tablesToColumns = require('../dbinfo');

module.exports = (message, args) => {
	var embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('Resetting...');

	message.channel.send({embed})
			.then(reply => addResourceToTable(0, embed, reply))
			.catch(console.error);
};

var addResourceToTable = (tableIndex, embed, reply) => {
	db.run(`TRUNCATE TABLE ${Object.keys(tablesToColumns)[0]}`)
			.then(() => {
				addResourceBatchToTable(tableIndex, 0, embed, reply, Date.now());
			}).catch(console.error);
}

var addResourceBatchToTable = (tableIndex, startIndex, embed, reply, startTime) => {
	const table = Object.keys(tablesToColumns)[tableIndex];

	var body = '';
	http.request({
		host: 'api.vexdb.io',
		path: `/v1/get_${table}?apikey=shNhxcphXlIXQVE2Npeu&limit_start=${startIndex}`
	}, response => {
		response.on('data', chunk => body += chunk);

		response.on('end', () => {
			body = JSON.parse(body);

			if (body.status == 1) {
				if (body.size > 0) {
					for (var row of body.result) {
						db.run(`INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).join(', ')})`)
								.catch(console.error);
					}
					addResourceBatchToTable(tableIndex, startIndex + body.size, embed, reply, startTime);
				} else {
					var duration = (Date.now() - startTime) / 1000;
					embed.setDescription(`${embed.description}\n${table} \`${duration}s\``);
					reply.edit({embed})
							.then(msg => addResourceToTable(tableIndex + 1, embed, msg))
							.catch(console.error);
				}
			} else {
				message.reply('Sorry, VexDB messed up.');
			}
		});
	}).end();
};
