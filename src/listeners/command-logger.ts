import {ApplyOptions} from '@sapphire/decorators';
import {
  Events,
  Listener,
  LogLevel,
  type ChatInputCommandAcceptedPayload,
} from '@sapphire/framework';
import {cyan} from 'colorette';

@ApplyOptions<Listener.Options>({event: Events.ChatInputCommandAccepted})
export class CommandAcceptedListener extends Listener<
  typeof Events.ChatInputCommandAccepted
> {
  public override run({interaction, command}: ChatInputCommandAcceptedPayload) {
    const shard = `[${cyan(interaction.guild?.shardId ?? 0)}]`;
    const commandName = cyan(command.name);
    const user = `${interaction.user.username}[${cyan(interaction.user.id)}]`;
    const server = interaction.guild
      ? `${interaction.guild.name}[${cyan(interaction.guild.id)}] `
      : '';
    const channel =
      interaction.guild && interaction.channel
        ? `${
            interaction.guild.channels.cache.get(interaction.channel.id)?.name
          }[${cyan(interaction.channel.id)}]`
        : cyan('Direct Messages');

    this.container.logger.debug(
      `${shard} - ${commandName} ${user} ${server}${channel}`
    );
  }

  public override onLoad() {
    this.enabled = this.container.logger.has(LogLevel.Debug);
    return super.onLoad();
  }
}
