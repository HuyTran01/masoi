import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGROU_BIOMES,
  AGROU_CLOAK_COLORS,
  AGROU_EMOTES,
  AGROU_HATS,
  CAMPFIRE_ABSTAIN_ID,
  appendNotebookTimelineEvent,
  createInitialNotebook,
  electMayorForVillage,
  formatNotebookShareSummary,
  getBotCosmetics,
  resolveNextMayorIfNeeded,
  tallyVotesWithMayor,
  updateNotebookPlayerEntry,
} from './agrouMechanics';
import { Player } from '../types/game';

const samplePlayers: Player[] = [
  { id: 'p1', name: 'An', avatar: '🐺', roleId: 'seer', isAlive: true },
  { id: 'p2', name: 'Bình', avatar: '🦊', roleId: 'werewolf', isAlive: true, isBot: true },
  { id: 'p3', name: 'Chi', avatar: '🦉', roleId: 'villager', isAlive: true, isBot: true },
  { id: 'p4', name: 'Dũng', avatar: '🐻', roleId: 'bodyguard', isAlive: true, isBot: true },
];

test('Agrou Mayor weighted voting gives Mayor x2 weight and breaks 1-vote ties', () => {
  // p1 (Mayor) votes for p2 -> 2 votes; p2 & p3 vote for p4 -> 2 votes (tie!)
  const tieResult = tallyVotesWithMayor(
    [
      { voterId: 'p1', targetId: 'p2' },
      { voterId: 'p2', targetId: 'p4' },
      { voterId: 'p3', targetId: 'p4' },
    ],
    'p1'
  );
  assert.equal(tieResult.isTie, true);
  assert.equal(tieResult.counts.p2, 2);
  assert.equal(tieResult.counts.p4, 2);

  // p1 (Mayor) votes for p2 (weight 2) vs p2 votes for p3 (weight 1) -> p2 wins 2-1
  const winResult = tallyVotesWithMayor(
    [
      { voterId: 'p1', targetId: 'p2' },
      { voterId: 'p2', targetId: 'p3' },
    ],
    'p1'
  );
  assert.equal(winResult.isTie, false);
  assert.equal(winResult.targetId, 'p2');
  assert.equal(winResult.counts.p2, 2);
  assert.equal(winResult.counts.p3, 1);
});

test('Agrou Campfire Abstention tracks abstainers without lynching the campfire', () => {
  const res = tallyVotesWithMayor(
    [
      { voterId: 'p1', targetId: CAMPFIRE_ABSTAIN_ID },
      { voterId: 'p2', targetId: CAMPFIRE_ABSTAIN_ID },
      { voterId: 'p3', targetId: 'p2' },
    ],
    'p1'
  );
  // Mayor abstained (weight 2) + p2 abstained (weight 1) = 3 abstain weight; p2 has 1 real vote
  assert.equal(res.abstainCount, 3);
  assert.deepEqual(res.abstainerIds, ['p1', 'p2']);
  assert.equal(res.targetId, 'p2');

  const allAbstain = tallyVotesWithMayor(
    [
      { voterId: 'p1', targetId: CAMPFIRE_ABSTAIN_ID },
      { voterId: 'p2', targetId: CAMPFIRE_ABSTAIN_ID },
    ],
    'p1'
  );
  assert.equal(allAbstain.targetId, null);
  assert.equal(allAbstain.isTie, false);
  assert.equal(allAbstain.abstainCount, 3);
});

test('Agrou Mayor election and crown succession when Mayor dies', () => {
  const mayorId = electMayorForVillage(samplePlayers, 'p1');
  assert.equal(mayorId, 'p1');

  const afterMayorDied = samplePlayers.map((p) =>
    p.id === 'p1' ? { ...p, isAlive: false } : p
  );
  const transfer = resolveNextMayorIfNeeded(afterMayorDied, 'p1');
  assert.equal(transfer.nextMayorId, 'p2');
  assert.equal(transfer.transferredFromName, 'An');
  assert.equal(transfer.transferredToName, 'Bình');
});

test('Agrou Deduction Notebook records role tags, timeline events, and chat share summary', () => {
  let nb = createInitialNotebook();
  nb = updateNotebookPlayerEntry(nb, 'p2', {
    guessedRole: 'werewolf',
    trust: 'wolf_lock',
    memo: 'Im lặng đáng ngờ',
  });
  nb = updateNotebookPlayerEntry(nb, 'p4', {
    guessedRole: 'bodyguard',
    trust: 'trusted',
  });
  nb = appendNotebookTimelineEvent(nb, {
    round: 1,
    phaseLabel: 'Sáng 1',
    text: 'Đêm bình yên, không ai thiệt mạng.',
    tone: 'info',
  });

  assert.equal(nb.timeline.length, 1);
  assert.equal(nb.playerNotes.p2.guessedRole, 'werewolf');
  const summaryVi = formatNotebookShareSummary(nb, samplePlayers, 'vi');
  assert.ok(summaryVi.includes('Bình'));
  assert.ok(summaryVi.includes('Dũng'));
  assert.ok(summaryVi.includes('Nghi Sói'));
  assert.ok(summaryVi.includes('Tin tưởng'));
});

test('Agrou biome palettes, hats, cloak colors, and emotes catalogs are complete', () => {
  assert.equal(Object.keys(AGROU_BIOMES).length, 3);
  assert.ok(AGROU_HATS.length >= 6);
  assert.ok(AGROU_CLOAK_COLORS.length >= 8);
  assert.equal(AGROU_EMOTES.length, 6);
  const botCosm = getBotCosmetics(3);
  assert.ok(AGROU_HATS.some((h) => h.id === botCosm.hat));
  assert.ok(AGROU_CLOAK_COLORS.some((c) => c.hex === botCosm.cloakColor));
});
