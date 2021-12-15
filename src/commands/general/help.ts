import {ApplyOptions} from '@sapphire/decorators';
import {Command, CommandOptions, Store} from '@sapphire/framework';
import {Message, MessageEmbed} from 'discord.js';

@ApplyOptions<CommandOptions>({
  description: 'help',
})
export class HelpCommand extends Command {
  public async messageRun(message: Message) {
    const commandsByCategory = new Map<string, string[]>();
    const store = this.store as Store<Command>;
    store.forEach(command => {
      const category = command.category ?? '';
      if (commandsByCategory.has(category)) {
        commandsByCategory.get(category)?.push(command.name);
      } else {
        commandsByCategory.set(category, [command.name]);
      }
    });

    const embed = new MessageEmbed()
      .setColor('#5965f3')
      .setTitle('vexibot help');
    commandsByCategory.forEach((commands, category) =>
      embed.addField(
        category,
        commands.map(command => `\`${command}\``).join(', ')
      )
    );

    return message.channel.send({embeds: [embed]});
  }
}
