const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

export const moneyToMinorUnits = (value: string): bigint => {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) throw new TypeError(`Invalid decimal money value: ${value}`);

  const [, sign, whole, rawFraction = ""] = match;
  const discardedFraction = rawFraction.slice(2);
  if (/[1-9]/.test(discardedFraction)) {
    throw new RangeError(`Money value has more than two decimal places: ${value}`);
  }

  const fraction = rawFraction.padEnd(2, "0").slice(0, 2);
  const units = BigInt(whole) * 100n + BigInt(fraction || "0");
  return sign === "-" ? -units : units;
};

export const minorUnitsToMoney = (value: bigint): string => {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
};

export const addMoney = (...values: string[]) =>
  minorUnitsToMoney(
    values.reduce((total, value) => total + moneyToMinorUnits(value), 0n),
  );

export const remainingMoney = (amount: string, paidAmount: string) => {
  const remaining = moneyToMinorUnits(amount) - moneyToMinorUnits(paidAmount);
  return minorUnitsToMoney(remaining > 0n ? remaining : 0n);
};

export const normalizeMoney = (value: string) =>
  minorUnitsToMoney(moneyToMinorUnits(value));
