import {ApplyOptions} from '@sapphire/decorators';
import {Args, Command, CommandOptions} from '@sapphire/framework';
import {PaginatedMessage} from '@sapphire/discord.js-utilities';
import {Constants, Message, MessageEmbed} from 'discord.js';
import {Team, TeamsRequestBuilder} from '../../lib/robot-events';
import {robotEventsClient} from '../..';

@ApplyOptions<CommandOptions>({
  aliases: ['team'],
  description: 'retrieve information about one or more teams',
})
export class TeamsCommand extends Command {
  public async messageRun(message: Message, args: Args): Promise<unknown> {
    if (args.finished) {
      return message.channel.send('You must provide at least 1 team number');
    }

    const numbers = await args.repeat('string');
    const teams = await robotEventsClient.teams
      .findAll(new TeamsRequestBuilder().numbers(...numbers).build())
      .toArray();
    if (!teams.length) {
      return message.channel.send('No teams found');
    }

    const paginatedMessage = new PaginatedMessage({
      template: new MessageEmbed().setColor(Constants.Colors.GREEN),
    }).setSelectMenuOptions(pageIndex => {
      return {label: this.labelFrom(teams[pageIndex - 1])};
    });
    teams
      .map(team => this.messageEmbedFrom(team))
      .forEach(embed => paginatedMessage.addPageEmbed(embed));
    return paginatedMessage.run(message);
  }

  private messageEmbedFrom(team: Team): MessageEmbed {
    const location = [
      team.location.city,
      team.location.region,
      team.location.country,
    ]
      .filter(l => l?.trim())
      .join(', ');
    const embed = new MessageEmbed()
      .setAuthor(
        this.labelFrom(team),
        undefined,
        `https://www.robotevents.com/teams/${team.program.code}/${team.number}`
      )
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
