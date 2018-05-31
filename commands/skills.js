const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');
const dbinfo = require('../dbinfo');

const db = app.db;
const addFooter = app.addFooter;
const getTeamId = vex.getTeamId;
const validTeamId = vex.validTeamId;
const getTeam = vex.getTeam;
const decodeProgram = dbinfo.decodeProgram;
const decodeSeason = dbinfo.decodeSeason;
const decodeSeasonUrl = dbinfo.decodeSeasonUrl;
const decodeGrade = dbinfo.decodeGrade;

const rankEmojis = ['🥇', '🥈', '🥉'];

module.exports = async (message, args) => {
	let teamId = getTeamId(message, args);
	if (validTeamId(teamId)) {
		try {
			let team = await getTeam(teamId);
			team = team[0];
			if (team) {
				const season = isNaN(teamId.charAt(0)) ? 126 : 125;
				teamId = team._id.id;
				try {
					const maxSkill = await db.collection('maxSkills').findOne({'_id.season': season, 'team.id': teamId});
					if (maxSkill) {
						const program = decodeProgram(maxSkill.team.prog);
						let rank = maxSkill._id.rank;
						rank = (rank <= 3) ? rankEmojis[rank - 1] : rank;

						const embed = new Discord.MessageEmbed()
							.setColor('GOLD')
							.setAuthor(teamId, null, `https://robotevents.com/teams/${program}/${teamId}`)
							.setTitle(`${program} ${decodeSeason(season)}`)
							.setURL(decodeSeasonUrl(season))
							.addField(`${decodeGrade(maxSkill._id.grade)} Rank`, rank, true)
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
						message.reply('that team hasn\'t competed in either skills challenge for In the Zone.')
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
