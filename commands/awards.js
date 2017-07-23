const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');
const vex = require('../vex');

const db = app.db;
const seasons = dbinfo.seasons;
const seasonUrls = dbinfo.seasonUrls;

const emojiToRegex = {
	'🥇': /^((?:Excellence Award)|(?:Tournament Champions)|(?:(?:Robot|Programming) Skills Winner))/,
	'🥈': /^((?:Tournament Finalists)|(?:(?:Robot|Programming) Skills Finalist))/,
	'🥉': /^((?:Tournament Semifinalists)|(?:(?:Robot|Programming) Skills Third Place))/,
	'🏅': /^(.+?)(?=\s+\(|$)/
};

const awardsOmitted = '\n**[Older awards omitted.]**';

module.exports = (message, args, embed) => {
	const teamId = vex.getTeamId(message, args);
	if (vex.validTeamId(teamId)) {
		vex.getTeam(teamId).then(team => {
			if (team) {
				db.collection('awards').aggregate([
					{$match: {team: team.number}},
					{$lookup: {from: 'events', localField: 'sku', foreignField: 'sku', as: 'events'}},
					{$project: {_id: 0, sku: 1, name: 1, event: {$arrayElemAt: ['$events', 0]}}},
					{$sort: {'event.season': -1, 'event.end': -1, sku: -1}},
					{$project: {sku: 1, name: 1, event: '$event.name', season: '$event.season'}}
				]).toArray().then(awards => {
					if (awards.length) {
						const descriptionHeader = `**${awards.length} Award${awards.length == 1 ? '' : 's'}**`;
						const eventsBySeason = new Array(seasons.length);
						for (let i = 0; i < seasons.length; i++) {
							eventsBySeason[i] = [];
						}
						let sku;
						let event;
						let seasonHeaders = [];
						let season = awards[0].season;
						let awardCount = 0;

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
								seasonHeaders[season] = `\n***[${seasons[season]}](${seasonUrls[season]})*** (${awardCount})`
								season = award.season;
								awardCount = 1;
							} else {
								awardCount++;
							}
						}
						eventsBySeason[season].push(event);
						seasonHeaders[season] = `\n***[${seasons[season]}](${seasonUrls[season]})*** (${awardCount})`

						let description = descriptionHeader;
						let atLimit = false;
						let linesRemaining = 30 - (3 + seasonHeaders.filter(header => header).length);
						let charsRemaining = 2048 - (descriptionHeader.length + awardsOmitted);
						seasonHeaders.forEach(header => charsRemaining -= header.length);

						for (let season = dbinfo.seasons.length - 1; season >= 0; season--) {
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
						}
						embed.setColor('PURPLE').setTitle(team.number)
							.setURL(`https://vexdb.io/teams/view/${team.number}?t=awards`)
							.setDescription(description);
						message.channel.send({embed});
					} else {
						message.reply('That team has never won an award.');
					}
				}).catch(console.error);
			} else {
				message.reply('That team ID has never been registered.');
			}
		}).catch(console.error);
	} else {
		message.reply('Please provide a valid team ID.');
	}
};
