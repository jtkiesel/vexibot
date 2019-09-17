import { db } from '..';
import { validTeamId, getTeam, createMatchEmbed } from '../vex';

export default async (message, args) => {
  const teamIds = args.split(' ').slice(1, 5);
  if (teamIds.every(teamId => validTeamId(teamId))) {
    const teams = [];
    for (let teamId of teamIds) {
      try {
        const team = (await getTeam(teamId))[0];
        if (team) {
          const ranking = (await db.collection('rankings').aggregate()
            .match({'_id.team': team._id, opr: {$exists: true}})
            .lookup({from: 'events', localField: '_id.event', foreignField: '_id', as: 'events'})
            .project({opr: 1, dpr: 1, event: {$arrayElemAt: ['$events', 0]}})
            .sort({'event.end': -1, '_id.event': -1})
            .limit(1)
            .project({opr: 1, dpr: 1}).toArray())[0];
          team.opr = ranking.opr;
          team.dpr = ranking.dpr;
          teams.push(team);
        }
      } catch(err) {
        console.error(err);
      }
    }
    if (teams.every(team => team != null)) {
      const red = [teams[0], teams[1]];
      const blue = [teams[2], teams[3]];

      const redOprSum = red.reduce((sum, team) => sum + team.opr);
      const blueOprSum = blue.reduce((sum, team) => sum + team.opr);

      const redDprSum = red.reduce((sum, team) => sum + team.dpr);
      const blueDprSum = blue.reduce((sum, team) => sum + team.dpr);

      const redScore = Math.max(0, Math.round(redOprSum + blueDprSum));
      const blueScore = Math.max(0, Math.round(blueOprSum + redDprSum));

      const match = {
        _id: {
          event: {
            _id: '',
            name: 'Theoretical'
          },
          division: '',
          round: 1,
          instance: 0,
          number: 0
        },
        program: (isNaN(red._id.id.charAt(0)) ? 4 : 1),
        red: red.map(team => team._id.id),
        blue: blue.map(team => team._id.id),
        redScore,
        blueScore,
        start: message.createdAt
      };
      message.channel.send({embed: createMatchEmbed(match)}).catch(console.error);
    } else {
      message.reply('that team ID has never been registered.').catch(console.error);
    }
  } else {
    message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
  }
};
