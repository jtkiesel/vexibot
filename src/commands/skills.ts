import { Constants, Message, MessageEmbed } from 'discord.js';

import { addFooter, Command, db } from '..';
import { getTeam, getTeamId, validTeamId } from '../vex';
import { decodeGrade, decodeProgram, decodeSeason, decodeSeasonUrl } from '../dbinfo';

const rankEmojis = ['🥇', '🥈', '🥉'];

class SkillsCommand implements Command {
  async execute(message: Message, args: string): Promise<Message> {
    let teamId = getTeamId(message, args);
    if (!validTeamId(teamId)) {
      return message.reply('please provide a valid team ID, such as **24B** or **BNS**.');
    }
    const team = (await getTeam(teamId))[0];
    if (!team) {
      return message.reply('that team ID has never been registered.');
    }
    const season = isNaN(parseInt(teamId.charAt(0))) ? 140 : 139;
    teamId = team._id.id;
    const maxSkill = await db().collection('maxSkills').findOne({'_id.season': season, 'team.id': teamId});
    if (!maxSkill) {
      return message.reply(`that team hasn't competed in either skills challenge for ${decodeSeason(season)}.`);
    }
    const program = decodeProgram(maxSkill.team.program);
    let rank = maxSkill._id.rank;
    rank = (rank <= 3) ? rankEmojis[rank - 1] : rank;

    const embed = new MessageEmbed()
      .setColor(Constants.Colors.GOLD)
      .setAuthor(teamId, null, `https://www.robotevents.com/teams/${program}/${teamId}`)
      .setTitle(`${program} ${decodeSeason(season)}`)
      .setURL(decodeSeasonUrl(season))
      .addField(`${decodeGrade(maxSkill._id.grade)} Rank`, rank, true)
      .addField('Score', maxSkill.score, true)
      .addField('Programming', maxSkill.programming, true)
      .addField('Driver', maxSkill.driver, true)
      .addField('Max Programming', maxSkill.maxProgramming, true)
      .addField('Max Driver', maxSkill.maxDriver, true);
    const reply = await message.channel.send(embed);
    return addFooter(message, reply);
  }
}

export default new SkillsCommand();
