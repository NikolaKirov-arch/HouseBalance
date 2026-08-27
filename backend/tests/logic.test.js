const assert = require('assert');
const { validateAndBuildSplits } = require('../utils/split');
const { calculateBalances, createSettlementPlan } = require('../utils/balance');

function total(splits) {
  return Math.round(splits.reduce((sum, split) => sum + split.owed_amount, 0) * 100);
}

async function runTests() {
  const equal = validateAndBuildSplits({
    amount: 10,
    splitType: 'equal',
    splits: [{ member_id: 1 }, { member_id: 2 }, { member_id: 3 }]
  });
  assert.deepStrictEqual(equal.map((split) => split.owed_amount), [3.34, 3.33, 3.33]);
  assert.strictEqual(total(equal), 1000);

  const exact = validateAndBuildSplits({
    amount: 25,
    splitType: 'exact',
    splits: [
      { member_id: 1, owed_amount: 10 },
      { member_id: 2, owed_amount: 15 }
    ]
  });
  assert.strictEqual(total(exact), 2500);

  const percentage = validateAndBuildSplits({
    amount: 100,
    splitType: 'percentage',
    splits: [
      { member_id: 1, percentage: 33.33 },
      { member_id: 2, percentage: 33.33 },
      { member_id: 3, percentage: 33.34 }
    ]
  });
  assert.strictEqual(total(percentage), 10000);

  const smallPercentage = validateAndBuildSplits({
    amount: 0.02,
    splitType: 'percentage',
    splits: [
      { member_id: 1, percentage: 25 },
      { member_id: 2, percentage: 25 },
      { member_id: 3, percentage: 25 },
      { member_id: 4, percentage: 25 }
    ]
  });
  assert.deepStrictEqual(
    smallPercentage.map((split) => split.owed_amount),
    [0.01, 0, 0.01, 0]
  );
  assert.strictEqual(total(smallPercentage), 2);

  assert.throws(
    () => validateAndBuildSplits({
      amount: 10,
      splitType: 'exact',
      splits: [{ member_id: 1, owed_amount: 9.99 }]
    }),
    /must equal/
  );

  const databaseResponses = [
    [
      { member_id: 1, role: 'admin', user_id: 1, first_name: 'Nikola', last_name: 'Kirov', email: 'nikola@example.com' },
      { member_id: 2, role: 'member', user_id: 2, first_name: 'Ana', last_name: 'Petrova', email: 'ana@example.com' },
      { member_id: 3, role: 'member', user_id: 3, first_name: 'Marko', last_name: 'Markov', email: 'marko@example.com' }
    ],
    [
      { member_id: 1, total_paid: 90 },
      { member_id: 2, total_paid: 45 },
      { member_id: 3, total_paid: 120 }
    ],
    [
      { member_id: 1, total_owed: 110 },
      { member_id: 2, total_owed: 75 },
      { member_id: 3, total_owed: 70 }
    ],
    [{ member_id: 2, settlements_paid: 10 }],
    [{ member_id: 3, settlements_received: 10 }]
  ];
  const fakeDatabase = {
    async execute() {
      return [databaseResponses.shift()];
    }
  };

  const balances = await calculateBalances(fakeDatabase, 1);
  assert.deepStrictEqual(balances.map((balance) => balance.net_balance), [-20, -20, 40]);

  const plan = createSettlementPlan(balances);
  assert.deepStrictEqual(plan.map((payment) => payment.amount), [20, 20]);

  console.log('All HouseBalance split, balance, and settlement-plan tests passed.');
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
