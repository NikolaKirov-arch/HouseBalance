function readNumber(value, fieldName) {
  if (value === '' || value === null || value === undefined) {
    throw new Error(`${fieldName} is required.`);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return number;
}

function toCents(value, fieldName = 'Amount') {
  const number = readNumber(value, fieldName);
  const cents = Math.round(number * 100);

  if (Math.abs(number * 100 - cents) > 0.000001) {
    throw new Error(`${fieldName} may have at most two decimal places.`);
  }

  return cents;
}

function toPercentageUnits(value, fieldName = 'Percentage') {
  const number = readNumber(value, fieldName);
  const units = Math.round(number * 100);

  if (Math.abs(number * 100 - units) > 0.000001) {
    throw new Error(`${fieldName} may have at most two decimal places.`);
  }

  return units;
}

function validateMemberIds(splits) {
  if (!Array.isArray(splits) || splits.length === 0) {
    throw new Error('Select at least one expense participant.');
  }

  const memberIds = splits.map((split) => Number(split.member_id));
  if (memberIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error('Every split must contain a valid member id.');
  }

  if (new Set(memberIds).size !== memberIds.length) {
    throw new Error('The same member cannot appear in an expense split twice.');
  }

  return memberIds;
}

function validateAndBuildSplits({ amount, splitType, splits }) {
  const amountCents = toCents(amount, 'Expense amount');
  if (amountCents <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  if (!['equal', 'exact', 'percentage'].includes(splitType)) {
    throw new Error('Split type must be equal, exact, or percentage.');
  }

  const memberIds = validateMemberIds(splits);

  if (splitType === 'equal') {
    const basicShare = Math.floor(amountCents / memberIds.length);
    const remainingCents = amountCents % memberIds.length;

    return memberIds.map((memberId, index) => ({
      member_id: memberId,
      owed_amount: (basicShare + (index < remainingCents ? 1 : 0)) / 100,
      percentage: null
    }));
  }

  if (splitType === 'exact') {
    const exactSplits = splits.map((split, index) => {
      const owedCents = toCents(split.owed_amount, `Owed amount for participant ${index + 1}`);
      if (owedCents < 0) {
        throw new Error('Exact split amounts cannot be negative.');
      }

      return {
        member_id: memberIds[index],
        owed_amount: owedCents / 100,
        percentage: null,
        owedCents
      };
    });

    const exactTotal = exactSplits.reduce((sum, split) => sum + split.owedCents, 0);
    if (exactTotal !== amountCents) {
      throw new Error('The exact split amounts must equal the total expense amount.');
    }

    return exactSplits.map(({ owedCents, ...split }) => split);
  }

  const percentageSplits = splits.map((split, index) => {
    const percentageUnits = toPercentageUnits(
      split.percentage,
      `Percentage for participant ${index + 1}`
    );

    if (percentageUnits <= 0 || percentageUnits > 10000) {
      throw new Error('Every percentage must be greater than 0 and at most 100.');
    }

    return {
      member_id: memberIds[index],
      percentage: percentageUnits / 100,
      percentageUnits
    };
  });

  const percentageTotal = percentageSplits.reduce(
    (sum, split) => sum + split.percentageUnits,
    0
  );
  if (percentageTotal !== 10000) {
    throw new Error('The percentage split values must equal 100%.');
  }

  let allocatedCents = 0;
  return percentageSplits.map((split, index) => {
    const isLast = index === percentageSplits.length - 1;
    const owedCents = isLast
      ? amountCents - allocatedCents
      : Math.round((amountCents * split.percentageUnits) / 10000);

    allocatedCents += owedCents;
    return {
      member_id: split.member_id,
      owed_amount: owedCents / 100,
      percentage: split.percentage
    };
  });
}

module.exports = { toCents, validateAndBuildSplits };

