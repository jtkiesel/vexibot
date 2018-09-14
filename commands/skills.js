const Discord = require('discord.js');

const app = require('../app');
const vex = require('../vex');
const dbinfo = require('../dbinfo');

const rankEmojis = ['🥇', '🥈', '🥉'];

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
			const season = isNaN(teamId.charAt(0)) ? 126 : 125;
			teamId = team._id.id;
			let maxSkill;
			try {
				maxSkill = await app.db.collection('maxSkills').findOne({'_id.season': season, 'team.id': teamId});
			} catch (err) {
				console.error(err);
			}
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
					app.addFooter(message, reply);
				} catch (err) {
					console.error(err);
				}
			} else {
				message.reply(`that team hasn't competed in either skills challenge for ${dbinfo.decodeSeason(season)}.`).catch(console.error);
			}
		} else {
			message.reply('that team ID has never been registered.').catch(console.error);
		}
	} else {
		message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
	}
};
