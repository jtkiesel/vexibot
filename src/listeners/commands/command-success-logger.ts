import {ApplyOptions} from '@sapphire/decorators';
import type {ChatInputCommandSuccessPayload} from '@sapphire/framework';
import {Events, Listener, LogLevel} from '@sapphire/framework';
import {cyan} from 'colorette';

@ApplyOptions<Listener.Options>({event: Events.ChatInputCommandSuccess})
export class CommandSuccessListener extends Listener<
  typeof Events.ChatInputCommandSuccess
> {
  public override run({interaction, command}: ChatInputCommandSuccessPayload) {
    const shard = `[${cyan(interaction.guild?.shardId ?? 0)}]`;
    const commandName = cyan(command.name);
    const user = `${interaction.user.username}[${cyan(interaction.user.id)}]`;
    const server = interaction.guild
      ? `${interaction.guild.name}[${cyan(interaction.guild.id)}]`
      : cyan('Direct Messages');
    this.container.logger.debug(`${shard} - ${commandName} ${user} ${server}`);
  }

  public override onLoad() {
    this.enabled = this.container.logger.has(LogLevel.Debug);
    return super.onLoad();
  }
}
