const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');
const vex = require('../vex');

const db = app.db;

const rankEmojis = ['🥇', '🥈', '🥉'];

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
		db.collection('maxSkills')
			.find({'_id.season': 119, 'team.grade': 'High School'})
			.sort({'scores.score': -1})
			.limit(35).toArray().then(teams => {
			description = '';
			for (let i = 0; i < teams.length; i++) {
				description += `**${(i < 3) ? rankEmojis[i] : `#${i + 1} `}**\t${teams[i].scores.score}\t[${teams[i].team.id}](https://vexdb.io/teams/view/${teams[i].team.id}?t=skills)\n`;
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
	}
};
