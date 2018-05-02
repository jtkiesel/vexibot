const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');

const client = app.client;
const db = app.db;
const addFooter = app.addFooter;
const encodeGrade = dbinfo.encodeGrade;
const decodeProgram = dbinfo.decodeProgram;
const decodeGrade = dbinfo.decodeGrade;
const decodeSeason = dbinfo.decodeSeason;
const decodeSeasonUrl = dbinfo.decodeSeasonUrl;

const rankEmojis = ['🥇', '🥈', '🥉'];
const pageSize = 10;
const previous = '🔺';
const next = '🔻';

const getDescription = (skills, index = 0) => {
	let description = '';
	for (let i = index; i < skills.length && i < (index + pageSize); i++) {
		const skill = skills[i];
		let rank = skill._id.rank;
		rank = (rank < 4) ? `${rankEmojis[rank - 1]}  ` : `**\`#${String(rank).padEnd(3)}\​\`**`;
		const score = String(skill.score).padStart(3);
		const prog = String(skill.prog).padStart(3);
		const driver = String(skill.driver).padStart(3);
		const team = skill.team.id;
		description += `${rank}   \`\​${score}\`   \`(\​${prog} / \​${driver})\`   [${team}](https://vexdb.io/teams/view/${team})\n`;
	}
	return description;
};

module.exports = async (message, args) => {
	const arg = args ? args.replace(/\s+/g, '') : '';

	let grade = arg ? arg.toLowerCase() : 'h';
	let program;
	let season;
	let limit;
	if (['h', 'hs', 'high', 'highschool'].includes(grade)) {
		program = 'VRC';
		grade = 'High School';
		season = 119;
		limit = 35;
	} else if (['m', 'ms', 'mid', 'middle', 'middleschool'].includes(grade)) {
		program = 'VRC';
		grade = 'Middle School';
		season = 119;
		limit = 15;
	} else if (['c', 'u', 'college', 'uni', 'university', 'vexu'].includes(grade)) {
		program = 'VEXU';
		grade = 'College';
		season = 120;
		limit = 5;
	} else {
		message.reply('please enter a valid grade, such as **h**, **m**, or **c**.');
		return;
	}
	try {
		const skills = await db.collection('maxSkills')
			.find({'_id.season': season, '_id.grade': encodeGrade(grade)})
			.sort({'_id.rank': 1}).toArray();
		if (skills.length) {
			let index = 0;
			const prog = decodeProgram(skills[index].team.prog);
			const grade = decodeGrade(skills[index]._id.grade);
			const season = decodeSeason(skills[index]._id.season);
			const seasonUrl = decodeSeasonUrl(skills[index]._id.season);
			const embed = new Discord.MessageEmbed()
				.setColor('GOLD')
				.setAuthor(`${grade} World Skills Standings`, null, `https://vexdb.io/skills/${prog}/${season.replace(/ /g, '_')}/Robot`)
				.setTitle(`${prog} ${season}`)
				.setURL(seasonUrl)
				.setDescription(getDescription(skills));

			try {
				const reply = await message.channel.send({embed: embed});
				const collector = reply.createReactionCollector((reaction, user) => {
					return user.id !== client.user.id && (reaction.emoji.name === previous || reaction.emoji.name === next);
				}, {time: 30000, dispose: true});
				collector.on('collect', (reaction, user) => {
					if (user.id === message.author.id) {
						index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
						if (index >= skills.length) {
							index = 0;
						} else if (index < 0) {
							index = Math.max(skills.length - pageSize, 0);
						}
						reply.edit({embed: embed.setDescription(getDescription(skills, index))});
					} else {
						reaction.users.remove(user);
					}
				});
				collector.on('remove', (reaction, user) => {
					if (user.id === message.author.id) {
						index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
						if (index >= skills.length) {
							index = 0;
						} else if (index < 0) {
							index = Math.max(skills.length - pageSize, 0);
						}
						reply.edit({embed: embed.setDescription(getDescription(skills, index))});
					}
				});
				collector.on('end', (collected, reason) => {
					let users = reply.reactions.get(next).users;
					users.forEach(user => users.remove(user));
					users = reply.reactions.get(previous).users;
					users.forEach(user => users.remove(user));
					addFooter(message, embed, reply);
				});
				await reply.react(previous);
				await reply.react(next);
			} catch (err) {
				console.log(err);
			}
		} else {
			message.reply(`no skills scores available for ${program} ${grade} In the Zone.`);
		}
	} catch (err) {
		console.error(err);
	}
};
