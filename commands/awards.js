const Discord = require('discord.js');
const db = require('sqlite');

const dbinfo = require('../dbinfo');
const vex = require('../vex');

const emojiToRegex= {
	'🥇': /^((?:Excellence Award)|(?:Tournament Champions)|(?:(?:Robot|Programming) Skills Winner))/,
	'🥈': /^((?:Tournament Finalists)|(?:(?:Robot|Programming) Skills Finalist))/,
	'🥉': /^((?:Tournament Semifinalists)|(?:(?:Robot|Programming) Skills Third Place))/,
	'🏅': /^(.+?)(?=\s+\(|$)/
};

const awardsOmittedString = '\n**[Older awards omitted.]**';

module.exports = (message, args) => {
	vex.getTeam(message, args).then(team => {
		if (team) {
			db.all(`SELECT e.season, e.name AS event, a.sku, a.name FROM awards AS a LEFT JOIN events AS e ON a.sku = e.sku WHERE a.team = ? ORDER BY e.season DESC, e.end DESC, a.sku DESC, 'a.order'`, team.number).then(totalAwards => {
				if (totalAwards.length) {
					const season = totalAwards[0].season;

					let awards = totalAwards.filter(award => award.season == season);
					let description = `**${totalAwards.length} Award${totalAwards.length == 1 ? '' : 's'}**\n***[${dbinfo.seasons[season]}](${dbinfo.seasonUrls[season]})*** (${awards.length}):`;
					let event = '';
					let sku = '';
					for (let award of awards) {
						if (award.sku != sku) {
							if (event) {
								if (description.split('\n').length + event.split('\n').length < 32
										&& description.length + event.length + awardsOmittedString.length <= 2048) {
									description += event;
								} else {
									description += awardsOmittedString;
									event = '';
									break;
								}
							}
							event = `\n[${award.event}](https://vexdb.io/events/view/${award.sku}?t=awards)`;
							sku = award.sku;
						}
						let awardEmoji = '🏅';
						let awardName = award.name;
						for (let [emoji, regex] of Object.entries(emojiToRegex)) {
							let matches = awardName.match(regex);
							if (matches) {
								awardEmoji = emoji;
								awardName = matches[0];
								break;
							}
						}
						event += `\n${awardEmoji}${awardName}`;
					};
					if (event) {
						if (description.split('\n').length + event.split('\n').length <= 32
								&& description.length + event.length <= 2048) {
							description += event;
						} else {
							description += awardsOmittedString;
						}
					}
					const embed = new Discord.RichEmbed()
						.setColor('PURPLE')
						.setTitle(team.number)
						.setURL(`https://vexdb.io/teams/view/${team.number}?t=awards`)
						.setDescription(description);

					message.channel.send({embed});
				} else {
					message.reply('That team has never won an award.');
				}
			}).catch(error => {
				console.log(`SELECT e.season, e.name AS event, a.sku, a.name FROM awards AS a LEFT JOIN events AS e ON a.sku = e.sku WHERE a.team = ${team.number} ORDER BY e.season DESC, e.end DESC, a.sku DESC, 'a.order'`);
				console.error(error);
			});
		}
	}).catch(console.error);
};
