const Discord = require('discord.js');
const http = require('http');
const db = require('sqlite');

const dbinfo = require('../dbinfo');

module.exports = (message, args) => {
	if (message.member.id === '197781934116569088') {
		const embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('Resetting...');

		message.channel.send({embed})
			.then(reply => addResourceToTable(0, embed, reply))
			.catch(console.error);
	} else {
		message.reply('You lack the role required to run that command.');
	}
};

var addResourceToTable = (tableIndex, embed, reply) => {
	const table = Object.keys(dbinfo.tablesToColumns)[tableIndex];

	db.run(`DELETE * FROM ${table}`)
		.then(addResourceBatchToTable(tableIndex, 0, embed, reply, Date.now()))
		.catch(error => {
			console.log(`DELETE * FROM ${table}`);
			console.error(error);
		});
}

var addResourceBatchToTable = (tableIndex, startIndex, embed, reply, startTime) => {
	const table = Object.keys(dbinfo.tablesToColumns)[tableIndex];

	http.request({
		host: 'api.vexdb.io',
		path: `/v1/get_${table}?apikey=shNhxcphXlIXQVE2Npeu&limit_start=${startIndex}`
	}, response => {
		let body = '';

		response.on('data', chunk => body += chunk);

		response.on('end', () => {
			body = JSON.parse(body);
			if (body.status == 1) {
				if (body.size > 0) {
					for (let row of body.result) {
						const values = dbinfo.formatValues[table](row);
						const placeholders = Array(values.length).fill('?').join(', ');
						db.run(`INSERT INTO ${table} VALUES (${placeholders})`, values)
							.catch(error => {
								console.log(`INSERT INTO ${table} VALUES (${placeholders}), ${values}`);
								console.error(error);
							});
					}
					addResourceBatchToTable(tableIndex, startIndex + body.size, embed, reply, startTime);
				} else {
					const duration = (Date.now() - startTime) / 1000;
					embed.setColor('RANDOM')
						.setDescription(`${embed.description}\n${table} \`${duration}s\``);
					reply.edit({embed}).then(msg => {
						if (++tableIndex < Object.keys(dbinfo.tablesToColumns).length) {
							addResourceToTable(tableIndex, embed, msg);
						}
					}).catch(console.error);
				}
			} else {
				console.error(`Error: VEXDB_ERROR: ${body.error_text} errno: ${body.error_code}`);
			}
		});
	}).end();
};
