import {ApplyOptions} from '@sapphire/decorators';
import {PaginatedMessage} from '@sapphire/discord.js-utilities';
import {Command} from '@sapphire/framework';
import {robotEventsClient, skillsCache} from '../..';
import {
  SeasonsRequestBuilder,
  TeamsRequestBuilder,
} from '../../lib/robot-events';
import {createErrorEmbed, createSuccessEmbed} from '../../lib/utils/embeds';

@ApplyOptions<Command.Options>({
  aliases: ['skill'],
  description: 'Get skills rankings/scores achieved by a team',
})
export class SkillsCommand extends Command {
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
      interaction.reply({
        embeds: [createErrorEmbed('No such team found')],
        ephemeral: true,
      });
      return;
    }

    const team = teams[0];
    const seasons = await robotEventsClient.seasons
      .findAll(new SeasonsRequestBuilder().teamIds(team.id).build())
      .toArray();
    const paginatedMessage = new PaginatedMessage({
      template: createSuccessEmbed().setAuthor({
        name: `${team.program.code} ${team.number}`,
        url: `https://www.robotevents.com/teams/${team.program.code}/${team.number}`,
      }),
    }).setSelectMenuOptions(page => ({label: seasons[page - 1].name}));
    seasons.forEach(season =>
      paginatedMessage.addPageEmbed(builder => {
        builder.setTitle(season.name);
        const skill = skillsCache.get(season.id, team.grade, team.id);
        if (!skill) {
          return builder.setDescription('No skills scores found');
        }
        return builder
          .addField('Rank', skill.rank.toString(), true)
          .addField('Score', skill.scores.score.toString(), true)
          .addField('Programming', skill.scores.programming.toString(), true)
          .addField('Driver', skill.scores.driver.toString(), true)
          .addField(
            'Highest Programming',
            skill.scores.maxProgramming.toString(),
            true
          )
          .addField('Highest Driver', skill.scores.maxDriver.toString(), true);
      })
    );
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
              .setDescription('The team to get skills rankings/scores for')
              .setRequired(true)
          ),
      {idHints: ['956005224743591936']}
    );
  }
}
