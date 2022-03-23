import {ApplyOptions} from '@sapphire/decorators';
import {LazyPaginatedMessage} from '@sapphire/discord.js-utilities';
import {Command} from '@sapphire/framework';
import {robotEventsClient} from '../..';
import {
  Award,
  SeasonsRequestBuilder,
  TeamAwardsRequestBuilder,
  TeamsRequestBuilder,
} from '../../lib/robot-events';
import {createErrorEmbed, createSuccessEmbed} from '../../lib/utils/embeds';

@ApplyOptions<Command.Options>({
  aliases: ['award'],
  description: 'Get awards awarded to a team',
})
export class AwardsCommand extends Command {
  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    const number = interaction.options.getString('team', true);
    const teams = await robotEventsClient.teams
      .findAll(
        new TeamsRequestBuilder().programIds(1, 4).numbers(number).build()
      )
      .toArray();
    if (!teams.length) {
      return interaction.reply({
        embeds: [createErrorEmbed('No such team found')],
        ephemeral: true,
      });
    }

    const team = teams[0];
    const seasons = await robotEventsClient.seasons
      .findAll(new SeasonsRequestBuilder().teamIds(team.id).build())
      .toArray();
    const paginatedMessage = new LazyPaginatedMessage({
      template: createSuccessEmbed().setAuthor({
        name: `${team.program.code} ${team.number}`,
        url: `https://www.robotevents.com/teams/${team.program.code}/${team.number}`,
      }),
    }).setSelectMenuOptions(page => ({label: seasons[page - 1].name}));
    seasons.forEach(season =>
      paginatedMessage.addAsyncPageEmbed(async builder => {
        const awardsByEventId = new Map<number, Award[]>();
        const awards = await robotEventsClient.awards
          .findAllByTeam(
            new TeamAwardsRequestBuilder()
              .teamId(team.id)
              .seasonIds(season.id)
              .build()
          )
          .toArray();
        awards.forEach(award => {
          const awardsForEventId = awardsByEventId.get(award.event.id);
          if (awardsForEventId === undefined) {
            awardsByEventId.set(award.event.id, [award]);
          } else {
            awardsForEventId.push(award);
          }
        });
        awardsByEventId.forEach(awardsForEvent =>
          builder.addField(
            awardsForEvent[0].event.name,
            awardsForEvent.map(award => award.title).join('\n'),
            true
          )
        );
        return builder.setTitle(`${season.name} (${awards.length})`);
      })
    );
    return paginatedMessage.run(interaction);
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
              .setDescription('The team to get awards for')
              .setRequired(true)
          ),
      {idHints: ['955839726756180018']}
    );
  }
}
