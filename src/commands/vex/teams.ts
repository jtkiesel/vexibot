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
    const number = interaction.options.getString(Option.TEAM, true);
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
      command =>
        command
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption(team =>
            team
              .setName(Option.TEAM)
              .setDescription('The team to get information for')
              .setRequired(true)
          ),
      {idHints: ['956001113650393188']}
    );
  }

  private messageEmbedFrom(team: Team) {
    const {
      location: {city, region, country},
      program,
      number,
      team_name,
      grade,
      registered,
      robot_name,
    } = team;
    const location = [city, region, country].filter(l => l?.trim()).join(', ');
    const embed = createSuccessEmbed()
      .setAuthor({
        name: this.labelFrom(team),
        url: `https://www.robotevents.com/teams/${program.code}/${number}`,
      })
      .setDescription(team_name)
      .addFields(
        {name: 'Program', value: program.code, inline: true},
        {name: 'Grade', value: grade, inline: true},
        {name: 'Active', value: registered ? 'Yes' : 'No', inline: true}
      );
    if (robot_name?.trim()) {
      embed.addFields({name: 'Robot', value: robot_name, inline: true});
    }
    if (location.trim()) {
      embed.addFields({name: 'Location', value: location, inline: true});
    }
    return embed;
  }

  private labelFrom(team: Team) {
    return `${team.program.code} ${team.number}`;
  }
}

enum Option {
  TEAM = 'team',
}
