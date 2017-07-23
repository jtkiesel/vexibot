const Discord = require('discord.js');

const app = require('../app');

const clockEmojis = ['🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕',
		'🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦'];

const formatTime = (time, unit) => `${time} ${unit}${(time == 1) ? '' : 's'}`;

module.exports = (message, args, embed) => {
	const milliseconds = new Date(app.client.uptime);

	let seconds = Math.floor(milliseconds / 1000);
	let minutes = Math.floor(seconds / 60);
	let hours = Math.floor(minutes / 60);
	let days = Math.floor(hours / 24);

	seconds %= 60;
	minutes %= 60;
	hours %= 24;

	let uptime = [];
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
	if (hours > 12) {
		emojis += clockEmojis[0];
		hours -= 12;
	}
	let halfHours = 2 * hours + Math.floor(minutes / 30);
	if (halfHours) {
		emojis += clockEmojis[halfHours];
	}
	embed.setColor('RANDOM').setDescription(`${emojis}\n${uptime.join(', ')}`);
	message.channel.send({embed});
};
