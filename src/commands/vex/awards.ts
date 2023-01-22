import {ApplyOptions} from '@sapphire/decorators';
import {LazyPaginatedMessage} from '@sapphire/discord.js-utilities';
import {Command} from '@sapphire/framework';
import {EmbedBuilder, type ChatInputCommandInteraction} from 'discord.js';
import {robotEventsClient} from '../..';
import {
  SeasonsRequestBuilder,
  TeamAwardsRequestBuilder,
  TeamsRequestBuilder,
  type Award,
} from '../../lib/robot-events';
import {Color} from '../../lib/utils/embeds';

@ApplyOptions<Command.Options>({
  aliases: ['award'],
  description: 'Get awards awarded to a team',
})
export class AwardsCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const number = interaction.options.getString(Option.TEAM, true);
    const teams = await robotEventsClient.teams
      .findAll(
        new TeamsRequestBuilder().programIds(1, 4).numbers(number).build()
      )
      .toArray();
    if (!teams.length) {
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.Red)
            .setDescription('No such team found'),
        ],
        ephemeral: true,
      });
      return;
    }

    const team = teams[0];
    const seasons = await robotEventsClient.seasons
      .findAll(new SeasonsRequestBuilder().teamIds(team.id).build())
      .toArray();
    const paginatedMessage = new LazyPaginatedMessage({
      template: new EmbedBuilder().setColor(Color.Green).setAuthor({
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
          builder.addFields({
            name: awardsForEvent[0].event.name,
            value: awardsForEvent.map(award => award.title).join('\n'),
            inline: true,
          })
        );
        return builder.setTitle(`${season.name} (${awards.length})`);
      })
    );
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
              .setDescription('The team to get awards for')
              .setRequired(true)
          ),
      {idHints: ['955839726756180018']}
    );
  }
}

enum Option {
  TEAM = 'team',
}
