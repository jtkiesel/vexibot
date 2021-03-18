import { Message, MessageEmbed } from 'discord.js';

import { addFooter, client, Command } from '..';

const formatTime = (time: number, unit: string): string => `${time} ${unit}${(time == 1) ? '' : 's'}`;

class UptimeCommand implements Command {
  async execute(message: Message): Promise<Message> {
    const milliseconds = new Date(client.uptime).getTime();

    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    seconds %= 60;
    minutes %= 60;
    hours %= 24;

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
    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setDescription(`🕒 ${uptime.join(', ')}`);
    const reply = await message.channel.send(embed);
    return addFooter(message, reply);
  }
}

export default new UptimeCommand();
