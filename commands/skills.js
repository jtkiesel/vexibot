const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');
const vex = require('../vex');

const db = app.db;

const rankEmojis = ['🥇', '🥈', '🥉'];

module.exports = (message, args) => {
	const teamId = vex.getTeamId(message, args);
	if (vex.validTeamId(teamId)) {
		vex.getTeam(teamId).then(team => {
			if (team) {
				const season = isNaN(teamId.charAt(0)) ? 120 : 119;

				db.collection('maxSkills').findOne({'_id.season': season, 'team.id': teamId}).then(maxSkill => {
					if (maxSkill) {
						let rank = maxSkill._id.rank;
						rank = (rank <= 3) ? rankEmojis[rank - 1] : rank;

						const embed = new Discord.RichEmbed()
							.setColor('AQUA')
							.setTitle(teamId)
							.setURL(`https://vexdb.io/teams/view/${teamId}?t=skills`)
							.addField('Global Rank', rank, true)
							.addField('Score', maxSkill.score, true)
							.addField('Programming', maxSkill.prog, true)
							.addField('Driver', maxSkill.driver, true)
							.addField('Max Programming', maxSkill.maxProg, true)
							.addField('Max Driver', maxSkill.maxDriver, true);
						message.channel.send({embed})
							.then(reply => app.addFooter(message, embed, reply))
							.catch(console.error);
					} else {
						message.reply('that team hasn\'t competed in skills for In the Zone.')
					}
				}).catch(console.error);
			} else {
				message.reply('that team ID has never been registered.');
			}
		}).catch(console.error);
	} else {
		message.reply('please provide a valid team ID.');
	}
};
