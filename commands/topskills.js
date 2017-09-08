const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');

const db = app.db;
const addFooter = app.addFooter;
const encodeGrade = dbinfo.encodeGrade;

const rankEmojis = ['🥇', '🥈', '🥉'];
const defaultEmoji = '🏅';

module.exports = async (message, args) => {
	const seasonName = 'In_The_Zone';
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
	} else if (['m', 'ms', 'middle', 'middleschool'].includes(grade)) {
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
		const teams = await db.collection('maxSkills')
			.find({'_id.season': season, 'team.grade': encodeGrade(grade)})
			.sort({'_id.rank': 1})
			.limit(limit).toArray();
		if (teams.length) {
			description = '';
			teams.forEach((maxSkill, i) => {
				const rank = (i < 3) ? `${rankEmojis[i]}` : `**\`#${String(i + 1).padEnd(2)}\​\`**`;
				const score = String(maxSkill.score).padStart(3);
				const prog = String(maxSkill.prog).padStart(3);
				const driver = String(maxSkill.driver).padStart(3);
				const team = maxSkill.team.id;
				description += `${rank}   \`\​${score}\`   \`(\​${prog} / \​${driver})\`   ${team}\n`;
			});
			const embed = new Discord.RichEmbed()
				.setColor('AQUA')
				.setTitle(`${program} ${grade} In the Zone Robot Skills`)
				.setURL(`https://vexdb.io/skills/${program}/${seasonName}/Robot`)
				.setDescription(description);
			try {
				const reply = await message.channel.send({embed});
				addFooter(message, embed, reply);
			} catch (err) {
				console.error(err);
			}
		} else {
			message.reply(`no skills scores available for ${program} ${grade} In the Zone.`);
		}
	} catch (err) {
		console.error(err);
	}
};
