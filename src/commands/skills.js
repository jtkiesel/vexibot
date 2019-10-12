import { MessageEmbed } from 'discord.js';

import { db, addFooter } from '..';
import { getTeamId, validTeamId, getTeam } from '../vex';
import { decodeProgram, decodeSeason, decodeSeasonUrl, decodeGrade } from '../dbinfo';

const rankEmojis = ['🥇', '🥈', '🥉'];

export default async (message, args) => {
  let teamId = getTeamId(message, args);
  if (validTeamId(teamId)) {
    let team;
    try {
      team = await getTeam(teamId);
      team = team[0];
    } catch (err) {
      console.error(err);
    }
    if (team) {
      const season = isNaN(teamId.charAt(0)) ? 131 : 130;
      teamId = team._id.id;
      let maxSkill;
      try {
        maxSkill = await db.collection('maxSkills').findOne({'_id.season': season, 'team.id': teamId});
      } catch (err) {
        console.error(err);
      }
      if (maxSkill) {
        const program = decodeProgram(maxSkill.team.program);
        let rank = maxSkill._id.rank;
        rank = (rank <= 3) ? rankEmojis[rank - 1] : rank;

        const embed = new MessageEmbed()
          .setColor('GOLD')
          .setAuthor(teamId, null, `https://www.robotevents.com/teams/${program}/${teamId}`)
          .setTitle(`${program} ${decodeSeason(season)}`)
          .setURL(decodeSeasonUrl(season))
          .addField(`${decodeGrade(maxSkill._id.grade)} Rank`, rank, true)
          .addField('Score', maxSkill.score, true)
          .addField('Programming', maxSkill.programming, true)
          .addField('Driver', maxSkill.driver, true)
          .addField('Max Programming', maxSkill.maxProgramming, true)
          .addField('Max Driver', maxSkill.maxDriver, true);
        try {
          const reply = await message.channel.send({embed});
          addFooter(message, reply);
        } catch (err) {
          console.error(err);
        }
      } else {
        message.reply(`that team hasn't competed in either skills challenge for ${decodeSeason(season)}.`).catch(console.error);
      }
    } else {
      message.reply('that team ID has never been registered.').catch(console.error);
    }
  } else {
    message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
  }
};
