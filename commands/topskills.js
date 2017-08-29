const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');
const vex = require('../vex');

const db = app.db;
const encodeGrade = dbinfo.encodeGrade;
const decodeGrade = dbinfo.decodeGrade;

const rankEmojis = ['🥇', '🥈', '🥉'];
const defaultEmoji = '🏅';

module.exports = (message, args) => {
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
	db.collection('maxSkills')
		.find({'_id.season': season, 'team.grade': encodeGrade(grade)})
		.sort({score: -1})
		.limit(limit).toArray().then(teams => {
		if (teams.length) {
			/*const embed = new Discord.RichEmbed()
				.setColor('AQUA')
				.setTitle(`${program} ${grade} In the Zone Robot Skills`)
				.setURL(`https://vexdb.io/skills/${program}/${seasonName}/Robot`);

			let i;
			for (i = 0; i < teams.length; i++) {
				let name = getName(i, teams[i].score);
				let value = getValue(teams[i].team.id);

				if (++i < teams.length) {
					name += ` \​ \​ \​ \​ ${getName(i, teams[i].score)}`;
					value += `       ${getValue(teams[i].team.id)}`;
				}
				embed.addField(name, value, true);
			}
			for (let j = Math.ceil(i / 2); i % 3; i++) {
				embed.addBlankField(true);
			}*/
			description = '';
			for (let i = 0; i < teams.length; i++) {
				const rank = (i < 3) ? `${rankEmojis[i]}` : `**\`#${String(i + 1).padEnd(2)}\​\`**`;
				const score = String(teams[i].score).padStart(3);
				const team = teams[i].team.id;
				description += `${rank}   \`\​${score}\`   ${team}\n`;
			}
			const embed = new Discord.RichEmbed()
				.setColor('AQUA')
				.setTitle(`${program} ${grade} In the Zone Robot Skills`)
				.setURL(`https://vexdb.io/skills/${program}/${seasonName}/Robot`)
				.setDescription(description);
			message.channel.send({embed})
				.then(reply => app.addFooter(message, embed, reply))
				.catch(console.error);
		} else {
			message.reply(`no skills scores available for ${program} ${grade} In the Zone.`);
		}
	}).catch(console.error);
};

/*const getName = (pos, score) => {
	const rank = (pos < 3) ? `${rankEmojis[pos]}` : `**\`#${String(pos + 1).padEnd(2)}\​\`**`;
	return `${rank} - \`${String(score).padStart(3, '\​ ')}\``;
};

const getValue = team => `[${team.padEnd(6)}](https://vexdb.io/teams/view/${team}?t=skills)`;*/
