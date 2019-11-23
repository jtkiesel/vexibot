import { Permissions } from 'discord.js';

import { client, db, prefix } from '..';
import { subscribedChannels } from '../vex';

export default async message => {
  if (message.guild) {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply(`mention the channel you want updates sent to, example: \`${prefix}updatesChannel #updates\``);
    }
    const permissions = channel.permissionsFor(client.user);
    if (!permissions.has(Permissions.FLAGS.SEND_MESSAGES)) {
      return message.reply(`I do not have the \`Send Messages\` permission in ${channel}`);
    }
    await db.collection('settings').updateOne({_id: message.guild.id}, {$set: {updatesChannel: channel.id}}, {upsert: true});
    subscribedChannels[message.guild.id] = channel.id;
    message.reply(`updates channel set to ${channel}`);
  }
};
