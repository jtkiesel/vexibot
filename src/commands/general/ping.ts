import {ApplyOptions} from '@sapphire/decorators';
import {Command, CommandOptions} from '@sapphire/framework';
import type {Message} from 'discord.js';

@ApplyOptions<CommandOptions>({
  description: 'ping pong',
})
export class PingCommand extends Command {
  public async messageRun(message: Message) {
    const reply = await message.channel.send('Ping?');

    const ping = Math.round(this.container.client.ws.ping);
    const timestampDelta = reply.createdTimestamp - message.createdTimestamp;
    const content = `Pong! Bot latency ${ping}ms. API latency ${timestampDelta}ms.`;

    return reply.edit(content);
  }
}
