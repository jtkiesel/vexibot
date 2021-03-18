import {ApplyOptions} from '@sapphire/decorators';
import {LazyPaginatedMessage} from '@sapphire/discord.js-utilities';
import {Args, Command, CommandOptions} from '@sapphire/framework';
import {Constants, Message, MessageEmbed} from 'discord.js';
import {robotEventsClient} from '..';
import {
  Award,
  SeasonsRequestBuilder,
  TeamAwardsRequestBuilder,
  TeamsRequestBuilder,
} from '../robot-events';

@ApplyOptions<CommandOptions>({
  aliases: ['award'],
  description: 'retrieve awards awarded to a team',
})
export class AwardsCommand extends Command {
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
        .setColor(Constants.Colors.PURPLE)
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
    return paginatedMessage.run(message);
  }
}
