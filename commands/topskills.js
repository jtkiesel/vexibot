const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');
const vex = require('../vex');

const db = app.db;

const rankEmojis = ['🥇', '🥈', '🥉'];
const defaultEmoji = '🏅';

module.exports = (message, args) => {
	if (args) {
		const teamId = vex.getTeamId(message, args);
		if (vex.validTeamId(teamId)) {
			vex.getTeam(teamId).then(team => {
				if (team) {
				} else {
					message.reply('That team ID has never been registered.');
				}
			}).catch(console.error);
		} else {
			message.reply('Please provide a valid team ID.');
		}
	} else {
		topSkills(message, 119, /*dbinfo.grades.indexOf(*/'High School'/*)*/, 35);
	}
};

const topSkills = (message, season, grade, limit) => {
	db.collection('maxSkills')
		.find({'_id.season': season, 'team.grade': grade})
		.sort({score: -1})
		.limit(limit).toArray().then(teams => {
		description = '';
		for (let i = 0; i < teams.length; i++) {
			const rank = (i < 3) ? `${rankEmojis[i]}\`:` : `\`#${String(i + 1).padEnd(2)} :`;
			const score = String(teams[i].scores.score).padStart(3);
			const team = teams[i].team.id;
			description += `${rank} ${score}\`  [${team}](https://vexdb.io/teams/view/${team}?t=skills)\n`;
		}
		const embed = new Discord.RichEmbed()
			.setColor('AQUA')
			.setTitle('In the Zone VRC HS Robot Skills')
			.setURL(`https://robotevents.com/robot-competitions/vex-robotics-competition/standings/skills`)
			.setDescription(description);
		message.channel.send({embed})
			.then(reply => app.addFooter(message, embed, reply))
			.catch(console.error);
	}).catch(console.error);
};
