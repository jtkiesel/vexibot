const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');
const vex = require('../vex');

const db = app.db;
const decodeSeason = dbinfo.decodeSeason;
const decodeSeasonUrl = dbinfo.decodeSeasonUrl;
const seasonIds = Object.keys(dbinfo.idToSeason).reverse();
const numSeasons = seasonIds.length;

const emojiToRegex = {
	'🥇': /^((?:Excellence Award)|(?:Tournament Champions)|(?:(?:Robot|Programming) Skills Winner))/,
	'🥈': /^((?:Tournament Finalists)|(?:(?:Robot|Programming) Skills Finalist))/,
	'🥉': /^((?:Tournament Semifinalists)|(?:(?:Robot|Programming) Skills Third Place))/,
	'🏅': /^(.+?)(?=\s+\(|$)/
};

const awardsOmitted = '\n**[Older awards omitted.]**';

const formatSeasonHeader = (season, awardCount) => `\n***[${decodeSeason(season)}](${decodeSeasonUrl(season)})*** (${awardCount})`;

module.exports = (message, args) => {
	const teamId = vex.getTeamId(message, args);
	if (vex.validTeamId(teamId)) {
		vex.getTeam(teamId).then(team => {
			if (team) {
				db.collection('awards').aggregate()
					.match({'_id.team': teamId})
					.lookup({from: 'events', localField: '_id.event', foreignField: '_id', as: 'events'})
					.project({sku: '$_id.event', name: '$_id.name', event: {$arrayElemAt: ['$events', 0]}})
					.sort({'event.season': -1, 'event.end': -1, sku: -1})
					.project({sku: 1, name: 1, event: '$event.name', season: '$event.season'})
					.toArray().then(awards => {
					console.log(awards);
					const numAwards = awards.length;
					if (numAwards) {
						const descriptionHeader = `**${numAwards} Award${numAwards == 1 ? '' : 's'}**`;
						const seasonHeaders = {};
						const eventsBySeason = {};
						let sku;
						let event;
						let season = awards[0].season;
						let awardCount = 0;

						awards.forEach(award => {
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
								seasonHeaders[season] = formatSeasonHeader(season, awardCount);
								season = award.season;
								awardCount = 1;
							} else {
								awardCount++;
							}
						});
						eventsBySeason[season].push(event);
						seasonHeaders[season] = formatSeasonHeader(season, awardCount);

						let description = descriptionHeader;
						let atLimit = false;
						let linesRemaining = 22 - (3 + seasonHeaders.filter(header => header).length);
						let charsRemaining = 2048 - (descriptionHeader.length + awardsOmitted);
						seasonHeaders.forEach(header => charsRemaining -= header.length);

						seasonIds.forEach(season => {
							if (seasonHeaders[season]) {
								description += seasonHeaders[season];

								if (!atLimit) {
									for (let i = 0; i < eventsBySeason[season].length; i++) {
										const event = eventsBySeason[season][i];
										charsRemaining -= event.length;
										linesRemaining -= event.split('\n').length - 1;
										if (charsRemaining < 0 || linesRemaining < 0) {
											if (i) {
												description += awardsOmitted;
											}
											atLimit = true;
											break;
										}
										description += event;
									}
								}
							}
						});
						const embed = new Discord.RichEmbed()
							.setColor('PURPLE')
							.setTitle(teamId)
							.setURL(`https://vexdb.io/teams/view/${teamId}?t=awards`)
							.setDescription(description);
						message.channel.send({embed})
							.then(reply => app.addFooter(message, embed, reply))
							.catch(console.error);
					} else {
						message.reply('that team has never won an award.');
					}
				}).catch(console.error);
			} else {
				message.reply('that team ID has never been registered.');
			}
		}).catch(console.error);
	} else {
		message.reply('please provide a valid team ID, such as **24B** or **BNS**.');
	}
};
