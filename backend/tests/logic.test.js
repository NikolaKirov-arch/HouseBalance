const assert = require('assert');
const { validateAndBuildSplits } = require('../utils/split');
const { calculateBalances, createSettlementPlan } = require('../utils/balance');

function totalCents(splits) {
  return Math.round(
    splits.reduce((sum, split) => sum + split.owed_amount, 0) * 100
  );
}

function testEqualSplits() {
  const splits = validateAndBuildSplits({
    amount: 10,
    splitType: 'equal',
    splits: [{ member_id: 1 }, { member_id: 2 }, { member_id: 3 }]
  });

  assert.deepStrictEqual(
    splits.map((split) => split.owed_amount),
    [3.34, 3.33, 3.33]
  );
  assert.strictEqual(totalCents(splits), 1000);
}

function testExactSplits() {
  const splits = validateAndBuildSplits({
    amount: 25,
    splitType: 'exact',
    splits: [
      { member_id: 1, owed_amount: 10 },
      { member_id: 2, owed_amount: 15 }
    ]
  });

  assert.strictEqual(totalCents(splits), 2500);
}

function testPercentageSplits() {
  const commonSplit = validateAndBuildSplits({
    amount: 100,
    splitType: 'percentage',
    splits: [
      { member_id: 1, percentage: 33.33 },
      { member_id: 2, percentage: 33.33 },
      { member_id: 3, percentage: 33.34 }
    ]
  });
  assert.strictEqual(totalCents(commonSplit), 10000);

  const smallSplit = validateAndBuildSplits({
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
    smallSplit.map((split) => split.owed_amount),
    [0.01, 0, 0.01, 0]
  );
  assert.strictEqual(totalCents(smallSplit), 2);
  assert.ok(smallSplit.every((split) => split.owed_amount >= 0));
}

function testInvalidSplits() {
  assert.throws(
    () => validateAndBuildSplits({
      amount: 0,
      splitType: 'equal',
      splits: [{ member_id: 1 }]
    }),
    /greater than zero/
  );

  assert.throws(
    () => validateAndBuildSplits({
      amount: 10.001,
      splitType: 'equal',
      splits: [{ member_id: 1 }]
    }),
    /two decimal places/
  );

  assert.throws(
    () => validateAndBuildSplits({
      amount: 10,
      splitType: 'equal',
      splits: []
    }),
    /at least one/
  );

  assert.throws(
    () => validateAndBuildSplits({
      amount: 10,
      splitType: 'equal',
      splits: [{ member_id: 0 }]
    }),
    /valid member id/
  );

  assert.throws(
    () => validateAndBuildSplits({
      amount: 10,
      splitType: 'other',
      splits: [{ member_id: 1 }]
    }),
    /Split type/
  );

  assert.throws(
    () => validateAndBuildSplits({
      amount: 10,
      splitType: 'equal',
      splits: [{ member_id: 1 }, { member_id: 1 }]
    }),
    /cannot appear.*twice/
  );

  assert.throws(
    () => validateAndBuildSplits({
      amount: 10,
      splitType: 'exact',
      splits: [{ member_id: 1, owed_amount: 9.99 }]
    }),
    /must equal/
  );

  assert.throws(
    () => validateAndBuildSplits({
      amount: 10,
      splitType: 'percentage',
      splits: [
        { member_id: 1, percentage: 60 },
        { member_id: 2, percentage: 30 }
      ]
    }),
    /equal 100%/
  );
}

async function testBalancesAndSettlementPlan() {
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
  assert.deepStrictEqual(
    balances.map((balance) => balance.net_balance),
    [-20, -20, 40]
  );

  const plan = createSettlementPlan(balances);
  assert.deepStrictEqual(
    plan.map((payment) => ({
      payer: payment.payer_member_id,
      receiver: payment.receiver_member_id,
      amount: payment.amount
    })),
    [
      { payer: 1, receiver: 3, amount: 20 },
      { payer: 2, receiver: 3, amount: 20 }
    ]
  );

  const settledBalances = balances.map((balance) => ({
    ...balance,
    net_balance: 0
  }));
  assert.deepStrictEqual(createSettlementPlan(settledBalances), []);
}

async function runTests() {
  testEqualSplits();
  testExactSplits();
  testPercentageSplits();
  testInvalidSplits();
  await testBalancesAndSettlementPlan();
  console.log('All HouseBalance financial logic tests passed.');
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
