import { MessageEmbed } from 'discord.js';

import { addFooter } from '..';

export default message => {
  const ping = Date.now();
  const embed = new MessageEmbed()
    .setColor('RANDOM')
    .setDescription('🏓 Pong!');
  message.channel.send({embed}).then(reply => {
    embed.setDescription(`${embed.description} \`${(Date.now() - ping) / 1000}s\``);
    reply.edit({embed})
      .then(reply => addFooter(message, reply))
      .catch(console.error);
  }).catch(console.error);
};
