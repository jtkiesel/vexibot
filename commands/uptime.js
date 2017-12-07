const Discord = require('discord.js');

const app = require('../app');

const clockEmojis = ['🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕',
		'🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦'];

const formatTime = (time, unit) => `${time} ${unit}${(time == 1) ? '' : 's'}`;

const getUptime = () => {
		let seconds = Math.floor(new Date(app.client.uptime) / 1000);
		let minutes = Math.floor(seconds / 60);
		seconds %= 60;
		let hours = Math.floor(minutes / 60);
		minutes %= 60;
		let days = Math.floor(hours / 24);
		hours %= 24;

		return [days, hours, minutes, seconds];
};

module.exports = (message, args) => {
	const [days, hours, minutes, seconds] = getUptime();
	const uptime = [];

	if (days) {
		uptime.push(formatTime(days, 'day'));
	}
	if (hours) {
		uptime.push(formatTime(hours, 'hour'));
	}
	if (minutes) {
		uptime.push(formatTime(minutes, 'minute'));
	}
	if (seconds) {
		uptime.push(formatTime(seconds, 'second'));
	}
	let emojis = Array(days + 1).join('📆');
	if (hours >= 12) {
		emojis += clockEmojis[0];
		hours -= 12;
	}
	const halfHours = 2 * hours + Math.floor(minutes / 30);
	if (halfHours) {
		emojis += clockEmojis[halfHours];
	}
	const embed = new Discord.MessageEmbed()
		.setColor('RANDOM')
		.setDescription(`${emojis}\n${uptime.join(', ')}`);
	message.channel.send({embed})
		.then(reply => app.addFooter(message, embed, reply))
		.catch(console.error);
};
