import { Message, MessageEmbed } from 'discord.js';

import { addFooter, Command } from '..';

class PingCommand implements Command {
  async execute(message: Message): Promise<Message> {
    const ping = Date.now();
    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setDescription('🏓 Pong!');
    let reply = await message.channel.send(embed);
    reply = await reply.edit(embed.setDescription(`${embed.description} \`${(Date.now() - ping) / 1000}s\``));
    return addFooter(message, reply);
  }
}

export default new PingCommand();
