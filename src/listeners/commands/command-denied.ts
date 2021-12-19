import type {CommandDeniedPayload, Events} from '@sapphire/framework';
import {Listener, UserError} from '@sapphire/framework';

export class CommandDeniedListener extends Listener<
  typeof Events.CommandDenied
> {
  public async run(userError: UserError, {message}: CommandDeniedPayload) {
    const allowedMentions = {users: [message.author.id], roles: []};
    return message.channel.send({content: userError.message, allowedMentions});
  }
}
