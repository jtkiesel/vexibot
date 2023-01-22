import {ApplyOptions} from '@sapphire/decorators';
import {PaginatedMessage} from '@sapphire/discord.js-utilities';
import {Command} from '@sapphire/framework';
import {EmbedBuilder, type ChatInputCommandInteraction} from 'discord.js';
import {robotEventsClient, skillsCache} from '../..';
import {
  SeasonsRequestBuilder,
  TeamsRequestBuilder,
} from '../../lib/robot-events';
import {Color} from '../../lib/utils/embeds';

@ApplyOptions<Command.Options>({
  aliases: ['skill'],
  description: 'Get skills rankings/scores achieved by a team',
})
export class SkillsCommand extends Command {
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
    const paginatedMessage = new PaginatedMessage({
      template: new EmbedBuilder().setColor(Color.Green).setAuthor({
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
        const {
          rank,
          scores: {score, programming, driver, maxProgramming, maxDriver},
        } = skill;
        return builder.addFields(
          {name: 'Rank', value: `${rank}`, inline: true},
          {name: 'Score', value: `${score}`, inline: true},
          {name: 'Programming', value: `${programming}`, inline: true},
          {name: 'Driver', value: `${driver}`, inline: true},
          {
            name: 'Highest Programming',
            value: `${maxProgramming}`,
            inline: true,
          },
          {name: 'Highest Driver', value: `${maxDriver}`, inline: true}
        );
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
              .setDescription('The team to get skills rankings/scores for')
              .setRequired(true)
          ),
      {idHints: ['956005224743591936']}
    );
  }
}

enum Option {
  TEAM = 'team',
}
