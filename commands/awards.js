const Discord = require('discord.js');
const db = require('sqlite');

const dbinfo = require('../dbinfo');
const vex = require('../vex');

const emojiToRegex = {
	'🥇': /^((?:Excellence Award)|(?:Tournament Champions)|(?:(?:Robot|Programming) Skills Winner))/,
	'🥈': /^((?:Tournament Finalists)|(?:(?:Robot|Programming) Skills Finalist))/,
	'🥉': /^((?:Tournament Semifinalists)|(?:(?:Robot|Programming) Skills Third Place))/,
	'🏅': /^(.+?)(?=\s+\(|$)/
};

const awardsOmitted = '\n**[Older awards omitted.]**';

module.exports = (message, args) => {
	vex.getTeam(message, args).then(team => {
		if (team) {
			db.all(`SELECT e.season, e.name AS event, a.sku, a.name FROM awards AS a LEFT JOIN events AS e ON a.sku = e.sku WHERE a.team = ? ORDER BY e.season DESC, e.end DESC, a.sku DESC, 'a.order'`, team.number).then(awards => {
				if (awards.length) {
					const descriptionHeader = `**${awards.length} Award${awards.length == 1 ? '' : 's'}**`;

					let awardCount = 0;
					let eventsBySeason = new Array(dbinfo.seasons.length);
					for (let i = 0; i < dbinfo.seasons.length; i++) {
						eventsBySeason[i] = [];
					}
					let sku;
					let event;
					let seasonHeaders = [];
					let season = awards[0].season;
					for (let i = 0; i < awards.length; i++) {
						award = awards[i];
						if (award.sku != sku) {
							if (event) {
								eventsBySeason[season].push(event);
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
						if (award.season != season) {
							seasonHeaders[season] = `\n***[${dbinfo.seasons[season]}](${dbinfo.seasonUrls[season]})*** (${awardCount})`
							season = award.season;
							awardCount = 1;
						} else {
							awardCount++;
						}
					}
					eventsBySeason[season].push(event);
					seasonHeaders[season] = `\n***[${dbinfo.seasons[season]}](${dbinfo.seasonUrls[season]})*** (${awardCount})`

					let charsRemaining = 2048 - (descriptionHeader.length + awardsOmitted);
					seasonHeaders.forEach(header => charsRemaining -= header.length);
					let linesRemaining = 30 - (3 + seasonHeaders.filter(header => header).length);
					let description = descriptionHeader;
					let atLimit = false;

					for (let season = dbinfo.seasons.length - 1; season >= 0; season--) {
						if (seasonHeaders[season]) {
							description += seasonHeaders[season];
							if (!atLimit) {
								for (let event of eventsBySeason[season]) {
									charsRemaining -= event.length;
									linesRemaining -= event.split('\n').length - 1;
									if (charsRemaining < 0 || linesRemaining < 0) {
										description += awardsOmitted;
										atLimit = true;
										break;
									}
									description += event;
								}
							}
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
