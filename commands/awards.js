module.exports = (message, args) => {
	var teamId;

	if (args) {
		teamId = args.trim().toUpperCase();
	} else {
		teamId = message.member.nickname.split(' | ', 2)[1];
	}
	if (/^([0-9]{1,5}[A-Z]?|[A-Z]{2,6}[0-9]{0,2})$/.test(teamId)) {
		var body = '';

		http.request({
			host: 'api.vexdb.io',
			path: '/v1/get_awards?apikey=shNhxcphXlIXQVE2Npeu&team=' + teamId
		}, response => {
			response.on('data', chunk => {
				body += chunk;
			});
			response.on('end', () => {
				body = JSON.parse(body);

				if (body.status == 1) {
					if (body.size > 0) {
						var team = body.result[0];

						var embed = new Discord.RichEmbed()
								.setColor('BLUE');
								.setTitle(teamId)
								.setURL('https://vexdb.io/teams/view/' + teamId + '?t=awards');

						message.channel.send({embed});
					} else {
						message.reply('That team ID has never been registered.');
					}
				} else {
					message.reply('Sorry, VexDB messed up.');
				}
			});
		}).end();
	} else {
		message.reply('Invalid team ID.');
	}
};
