const Discord = require('discord.js');
const he = require('he');

const vex = require('../vex');

module.exports = (message, args) => {
	vex.getTeam(message, args).then(team => {
		const team_name = he.decode(team.team_name);
		const robot_name = he.decode(team.robot_name);
		const organisation = he.decode(team.organisation);

		let location = [team.city];
		if (team.region && team.region != 'N/A' && team.region != 'Not Applicable or Not Listed') {
			location.push(team.region);
		}
		if (team.country) {
			location.push(team.country);
		}
		location = location.join(', ');

		const embed = new Discord.RichEmbed()
			.setColor('GREEN')
			.setTitle(team.number)
			.setURL(`https://vexdb.io/teams/view/${team.number}`)
			.addField('Team Name', team_name, true);

		if (robot_name) {
			embed.addField('Robot Name', robot_name, true);
		}
		if (organisation) {
			embed.addField('Organization', organisation, true);
		}
		embed.addField('Location', location, true);

		message.channel.send({embed});
	}).catch(console.error);
};
