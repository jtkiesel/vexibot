const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');
const dbinfo = require('../dbinfo');

const db = app.db;
const addFooter = app.addFooter;

const rankEmojis = ['🥇', '🥈', '🥉'];

module.exports = async (message, args) => {
	let teamId = vex.getTeamId(message, args);
	if (vex.validTeamId(teamId)) {
		try {
			let team = await vex.getTeam(teamId);
			team = team[0];
			if (team) {
				const season = isNaN(teamId.charAt(0)) ? 126 : 125;
				teamId = team._id.id;
				try {
					const maxSkill = await db.collection('maxSkills').findOne({'_id.season': season, 'team.id': teamId});
					if (maxSkill) {
						const program = dbinfo.decodeProgram(maxSkill.team.prog);
						let rank = maxSkill._id.rank;
						rank = (rank <= 3) ? rankEmojis[rank - 1] : rank;

						const embed = new Discord.MessageEmbed()
							.setColor('GOLD')
							.setAuthor(teamId, null, `https://robotevents.com/teams/${program}/${teamId}`)
							.setTitle(`${program} ${dbinfo.decodeSeason(season)}`)
							.setURL(dbinfo.decodeSeasonUrl(season))
							.addField(`${dbinfo.decodeGrade(maxSkill._id.grade)} Rank`, rank, true)
							.addField('Score', maxSkill.score, true)
							.addField('Programming', maxSkill.prog, true)
							.addField('Driver', maxSkill.driver, true)
							.addField('Max Programming', maxSkill.maxProg, true)
							.addField('Max Driver', maxSkill.maxDriver, true);
						try {
							const reply = await message.channel.send({embed});
							addFooter(message, embed, reply);
						} catch (err) {
							console.error(err);
						}
					} else {
						message.reply(`that team hasn\'t competed in either skills challenge for ${dbinfo.decodeSeason(season)}.`);
					}
				} catch (err) {
					console.error(err);
				}
			} else {
				message.reply('that team ID has never been registered.');
			}
		} catch (err) {
			console.error(err);
		}
	} else {
		message.reply('please provide a valid team ID, such as **24B** or **BNS**.');
	}
};
