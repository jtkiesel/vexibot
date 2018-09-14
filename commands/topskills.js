const { MessageEmbed } = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');

const rankEmojis = ['🥇', '🥈', '🥉'];
const pageSize = 10;
const previous = '🔺';
const next = '🔻';

const emojis = [previous, next];

const getDescription = (skills, index = 0) => {
	let description = '';
	for (let i = index; i < skills.length && i < (index + pageSize); i++) {
		const skill = skills[i];
		let rank = skill._id.rank;
		rank = (rank < 4) ? `${rankEmojis[rank - 1]}  ` : `**\`#${String(rank).padEnd(3)}\u200B\`**`;
		const score = String(skill.score).padStart(3);
		const prog = String(skill.prog).padStart(3);
		const driver = String(skill.driver).padStart(3);
		const team = skill.team.id;
		description += `${rank}   \`\u200B${score}\`   \`(\u200B${prog} / \u200B${driver})\`   [${team}](https://robotevents.com/teams/${dbinfo.decodeProgram(skill.team.prog)}/${team})\n`;
	}
	return description;
};

module.exports = async (message, args) => {
	const arg = args ? args.replace(/\s+/g, '') : '';

	let grade = arg ? arg.toLowerCase() : 'h';
	let program;
	let season;
	if (['h', 'hs', 'high', 'highschool'].includes(grade)) {
		program = 'VRC';
		grade = 'High School';
		season = 125;
	} else if (['m', 'ms', 'mid', 'middle', 'middleschool'].includes(grade)) {
		program = 'VRC';
		grade = 'Middle School';
		season = 125;
	} else if (['c', 'u', 'college', 'uni', 'university', 'vexu'].includes(grade)) {
		program = 'VEXU';
		grade = 'College';
		season = 126;
	} else {
		message.reply('please enter a valid grade, such as **h**, **m**, or **c**.');
		return;
	}
	let skills;
	try {
		skills = await app.db.collection('maxSkills')
			.find({'_id.season': season, '_id.grade': dbinfo.encodeGrade(grade)})
			.sort({'_id.rank': 1}).toArray();
	} catch (err) {
		console.error(err);
	}
	if (skills && skills.length) {
		let index = 0;
		const prog = dbinfo.decodeProgram(skills[index].team.prog);
		const grade = dbinfo.decodeGrade(skills[index]._id.grade);
		const season = dbinfo.decodeSeason(skills[index]._id.season);
		const seasonUrl = dbinfo.decodeSeasonUrl(skills[index]._id.season);
		const embed = new MessageEmbed()
			.setColor('GOLD')
			.setAuthor(`${grade} World Skills Standings`, null, `https://vexdb.io/skills/${prog}/${season.replace(/ /g, '_')}/Robot`)
			.setTitle(`${prog} ${season}`)
			.setURL(seasonUrl)
			.setDescription(getDescription(skills));

		try {
			const reply = await message.channel.send({embed});
			const collector = reply.createReactionCollector((reaction, user) => {
				return (user.id === message.author.id) && emojis.includes(reaction.emoji.name);
			}, {time: 30000, dispose: true});
			const lastPage = Math.max(skills.length - pageSize, 0);
			collector.on('collect', reaction => {
				index += ((reaction.emoji.name === next) ? 1 : -1) * pageSize;
				if (index >= skills.length) {
					index = 0;
				} else if (index < 0) {
					index = lastPage;
				}
				embed.setDescription(getDescription(skills, index));
				reply.edit({embed});
			});
			collector.on('remove', reaction => {
				index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
				if (index >= skills.length) {
					index = 0;
				} else if (index < 0) {
					index = lastPage;
				}
				embed.setDescription(getDescription(skills, index));
				reply.edit({embed});
			});
			collector.on('end', () => {
				reply.reactions.removeAll();
				app.addFooter(message, reply);
			});
			await reply.react(previous);
			reply.react(next);
		} catch (err) {
			console.log(err);
		}
	} else {
		message.reply(`no skills scores available for ${grade} ${program} ${dbinfo.decodeSeason(season)}.`).catch(console.error);
	}
};
