import {ApplyOptions} from '@sapphire/decorators';
import {Args, Command, CommandOptions} from '@sapphire/framework';
import {LazyPaginatedMessage} from '@sapphire/discord.js-utilities';
import {Constants, Message, MessageEmbed} from 'discord.js';
import {SeasonsRequestBuilder, TeamsRequestBuilder} from '../robot-events';
import {robotEventsClient, robotEventsV1Client} from '..';
import {SeasonSkillsRequestBuilder} from '../robot-events/v1/clients/skills';

@ApplyOptions<CommandOptions>({
  aliases: ['skill'],
  description: 'retrieve skills rankings/scores achieved by a team',
})
export class SkillsCommand extends Command {
  public async messageRun(message: Message, args: Args): Promise<unknown> {
    if (args.finished) {
      return message.channel.send('You must provide a team number');
    }

    const number = args.next();
    const teams = await robotEventsClient.teams
      .findAll(
        new TeamsRequestBuilder().programIds(1, 4).numbers(number).build()
      )
      .toArray();
    if (!teams.length) {
      return message.channel.send('No team found');
    }

    const team = teams[0];
    const seasons = await robotEventsClient.seasons
      .findAll(new SeasonsRequestBuilder().teamIds(team.id).build())
      .toArray();
    const paginatedMessage = new LazyPaginatedMessage({
      template: new MessageEmbed()
        .setColor(Constants.Colors.GREEN)
        .setAuthor(
          `${team.program.code} ${team.number}`,
          undefined,
          `https://www.robotevents.com/teams/${team.program.code}/${team.number}`
        ),
    }).setSelectMenuOptions(pageIndex => {
      return {label: seasons[pageIndex - 1].name};
    });
    seasons.forEach(season =>
      paginatedMessage.addAsyncPageEmbed(async builder => {
        builder.setTitle(season.name);
        const skills = await robotEventsV1Client.skills.findAllBySeason(
          new SeasonSkillsRequestBuilder()
            .seasonId(season.id)
            .grade(team.grade)
            .build()
        );
        const skill = skills.find(({team: {id}}) => id === team.id);
        if (!skill) {
          return builder.setDescription('No skills scores found');
        }
        return builder
          .setTitle(season.name)
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
    return paginatedMessage.run(message);
  }
}
