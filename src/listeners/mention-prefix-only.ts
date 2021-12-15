import {Events, Listener} from '@sapphire/framework';
import type {Message} from 'discord.js';

export class MentionPrefixOnlyListener extends Listener<
  typeof Events.MentionPrefixOnly
> {
  public async run(message: Message) {
    const prefix = this.container.client.options.defaultPrefix;
    return message.channel.send(
      prefix
        ? `My prefix in this guild is: \`${prefix}\``
        : 'You do not need a prefix in DMs.'
    );
  }
}
