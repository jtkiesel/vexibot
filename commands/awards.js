const Discord = require('discord.js');
const he = require('he');

const app = require('../app');
const vex = require('../vex');
const dbinfo = require('../dbinfo');

const emojiToRegex = {
	'🏆': /^(.*World Champion.*)$/i,
	'🥇': /^(.*(?:Excellence|Champion|Skills(?: Challenge)? Winner|First|1st).*)/i,
	'🥈': /^(.*(?:Finalist|Second|2nd).*)$/i,
	'🥉': /^(.*(?:Semifinalist|Third|3rd).*)$/i,
	'🏅': /^(.+?)(?=\s+\(|$)/
};

const awardsOmitted = '\n**[Older awards omitted.]**';

module.exports = async (message, args) => {
	let teamId = vex.getTeamId(message, args);
	if (vex.validTeamId(teamId)) {
		let team;
		try {
			team = await vex.getTeam(teamId);
			team = team[0];
		} catch (err) {
			console.error(err);
		}
		if (team) {
			teamId = team._id.id;
			const prog = team._id.prog;
			let awards;
			try {
				awards = await app.db.collection('awards').aggregate()
					.match({'team.id': teamId, 'team.prog': prog})
					.lookup({from: 'events', localField: '_id.event', foreignField: '_id', as: 'events'})
					.project({sku: '$_id.event', name: '$_id.name', event: {$arrayElemAt: ['$events', 0]}})
					.sort({'event.season': -1, 'event.end': -1, sku: -1})
					.project({sku: 1, name: 1, event: '$event.name', season: '$event.season'}).toArray();
			} catch (err) {
				console.error(err);
			}
			if (awards && awards.length) {
				const descriptionHeader = `**${awards.length} Award${awards.length === 1 ? '' : 's'}**`;
				const eventsBySeason = {};
				const seasonHeaders = {};
				let sku;
				let event;
				let season = awards[0].season;
				let awardCount = 0;

				for (let i = 0; i < awards.length; i++) {
					const award = awards[i];
					if (award.sku !== sku) {
						if (event) {
							if (eventsBySeason.hasOwnProperty(season)) {
								eventsBySeason[season].push(event);
							} else {
								eventsBySeason[season] = [event];
							}
						}
						event = `\n[${he.decode(award.event)}](https://robotevents.com/${award.sku}.html#tab-awards)`;
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

					if (award.season !== season) {
						seasonHeaders[season] = `\n***[${dbinfo.decodeSeason(season)}](${dbinfo.decodeSeasonUrl(season)})*** (${awardCount})`;
						season = award.season;
						awardCount = 1;
					} else {
						awardCount++;
					}
				}
				if (eventsBySeason.hasOwnProperty(season)) {
					eventsBySeason[season].push(event);
				} else {
					eventsBySeason[season] = [event];
				}
				seasonHeaders[season] = `\n***[${dbinfo.decodeSeason(season)}](${dbinfo.decodeSeasonUrl(season)})*** (${awardCount})`;

				let description = descriptionHeader;
				let atLimit = false;
				let linesRemaining = 30 - (3 + Object.keys(seasonHeaders).length);
				let charsRemaining = 2048 - (descriptionHeader.length + awardsOmitted);
				Object.values(seasonHeaders).forEach(header => charsRemaining -= header.length);

				for (let [season, header] of Object.entries(seasonHeaders).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
					description += header;

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
				const program = dbinfo.decodeProgram(prog);
				const embed = new Discord.MessageEmbed()
					.setColor('PURPLE')
					.setTitle(`${program} ${teamId}`)
					.setURL(`https://robotevents.com/teams/${program}/${teamId}`)
					.setDescription(description);
				try {
					const reply = await message.channel.send({embed});
					app.addFooter(message, reply);
				} catch (err) {
					console.error(err);
				}
			} else {
				message.reply('that team has never won an award.').catch(console.error);
			}
		} else {
			message.reply('that team ID has never been registered.').catch(console.error);
		}
	} else {
		message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
	}
};
