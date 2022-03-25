import {inlineCode} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Command} from '@sapphire/framework';
import type {Message} from 'discord.js';
import {createInfoEmbed} from '../../lib/utils/embeds';

@ApplyOptions<Command.Options>({
  description: 'Test connection to Discord',
  chatInputCommand: {register: true, idHints: ['954985659146313800']},
})
export class PingCommand extends Command {
  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    const interactionReceived = Date.now();
    const fromDiscord = interactionReceived - interaction.createdTimestamp;

    const reply = (await interaction.reply({
      embeds: [createInfoEmbed('Ping? 👀')],
      ephemeral: true,
      fetchReply: true,
    })) as Message;

    const toDiscord = reply.createdTimestamp - interactionReceived;
    const roundTrip = reply.createdTimestamp - interaction.createdTimestamp;
    const gatewayHeartbeat =
      interaction.guild?.shard.ping ?? interaction.client.ws.ping;
    const client = interaction.client.user?.username;

    const embed = createInfoEmbed(
      [
        'Pong! 🏓',
        '🐌 Latency:',
        `┣ Discord -> ${client}: ${inlineCode(fromDiscord + 'ms')}`,
        `┣ ${client} -> Discord: ${inlineCode(toDiscord + 'ms')}`,
        `┗ Round trip: ${inlineCode(roundTrip + 'ms')}`,
        `💓 Gateway heartbeat: ${inlineCode(gatewayHeartbeat + 'ms')}`,
      ].join('\n')
    );

    interaction.editReply({embeds: [embed]});
  }
}
