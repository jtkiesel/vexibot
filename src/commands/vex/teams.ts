import {ApplyOptions} from '@sapphire/decorators';
import {PaginatedMessage} from '@sapphire/discord.js-utilities';
import {Command} from '@sapphire/framework';
import {robotEventsClient} from '../..';
import {Team, TeamsRequestBuilder} from '../../lib/robot-events';
import {createErrorEmbed, createSuccessEmbed} from '../../lib/utils/embeds';

@ApplyOptions<Command.Options>({
  aliases: ['team'],
  description: 'Get information about a team',
})
export class TeamsCommand extends Command {
  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    const number = interaction.options.getString('team', true);
    const teams = await robotEventsClient.teams
      .findAll(new TeamsRequestBuilder().numbers(number).build())
      .toArray();
    if (!teams.length) {
      interaction.reply({
        embeds: [createErrorEmbed('No such team found')],
        ephemeral: true,
      });
      return;
    }

    const paginatedMessage = new PaginatedMessage({
      template: createSuccessEmbed(),
    }).setSelectMenuOptions(page => ({label: this.labelFrom(teams[page - 1])}));
    teams
      .map(team => this.messageEmbedFrom(team))
      .forEach(embed => paginatedMessage.addPageEmbed(embed));
    paginatedMessage.run(interaction);
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      builder =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption(team =>
            team
              .setName('team')
              .setDescription('The team to get information for')
              .setRequired(true)
          ),
      {idHints: ['956001113650393188']}
    );
  }

  private messageEmbedFrom(team: Team) {
    const location = [
      team.location.city,
      team.location.region,
      team.location.country,
    ]
      .filter(l => l?.trim())
      .join(', ');
    const embed = createSuccessEmbed()
      .setAuthor({
        name: this.labelFrom(team),
        url: `https://www.robotevents.com/teams/${team.program.code}/${team.number}`,
      })
      .setDescription(team.team_name)
      .addField('Program', team.program.code, true)
      .addField('Grade', team.grade, true)
      .addField('Active', team.registered ? 'Yes' : 'No', true);
    if (team.robot_name?.trim()) {
      embed.addField('Robot', team.robot_name, true);
    }
    if (location?.trim()) {
      embed.addField('Location', location, true);
    }
    return embed;
  }

  private labelFrom(team: Team) {
    return `${team.program.code} ${team.number}`;
  }
}
