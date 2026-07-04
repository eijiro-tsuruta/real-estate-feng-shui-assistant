export type Gender = "male" | "female";

export type KuaProfile = {
  number: Exclude<number, 5>;
  trigram: string;
  group: "東四命" | "西四命";
  favorableDirections: string[];
  unfavorableDirections: string[];
  note: string;
};

const profiles: Record<Exclude<number, 5>, Omit<KuaProfile, "number" | "note">> = {
  1: {
    trigram: "坎（かん）",
    group: "東四命",
    favorableDirections: ["南東", "東", "南", "北"],
    unfavorableDirections: ["西", "北東", "北西", "南西"],
  },
  2: {
    trigram: "坤（こん）",
    group: "西四命",
    favorableDirections: ["北東", "西", "北西", "南西"],
    unfavorableDirections: ["東", "南東", "北", "南"],
  },
  3: {
    trigram: "震（しん）",
    group: "東四命",
    favorableDirections: ["南", "北", "南東", "東"],
    unfavorableDirections: ["南西", "北西", "北東", "西"],
  },
  4: {
    trigram: "巽（そん）",
    group: "東四命",
    favorableDirections: ["北", "南", "東", "南東"],
    unfavorableDirections: ["北東", "西", "南西", "北西"],
  },
  6: {
    trigram: "乾（けん）",
    group: "西四命",
    favorableDirections: ["西", "北東", "南西", "北西"],
    unfavorableDirections: ["南東", "東", "北", "南"],
  },
  7: {
    trigram: "兌（だ）",
    group: "西四命",
    favorableDirections: ["北西", "南西", "北東", "西"],
    unfavorableDirections: ["北", "南", "南東", "東"],
  },
  8: {
    trigram: "艮（ごん）",
    group: "西四命",
    favorableDirections: ["南西", "北西", "西", "北東"],
    unfavorableDirections: ["南", "北", "東", "南東"],
  },
  9: {
    trigram: "離（り）",
    group: "東四命",
    favorableDirections: ["東", "南東", "北", "南"],
    unfavorableDirections: ["北西", "南西", "西", "北東"],
  },
};

function reduceToSingleDigit(value: number): number {
  let result = Math.abs(value);
  while (result > 9) {
    result = String(result)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return result;
}

export function calculateKua(year: number, gender: Gender): KuaProfile {
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
    throw new Error("生年は1900年から今年までの範囲で入力してください。");
  }

  const lastTwoDigits = year % 100;
  const yearDigit = reduceToSingleDigit(lastTwoDigits);
  const base =
    year >= 2000
      ? gender === "male"
        ? 9 - yearDigit
        : yearDigit + 6
      : gender === "male"
        ? 10 - yearDigit
        : yearDigit + 5;

  let number = reduceToSingleDigit(base);
  if (number === 5) {
    number = gender === "male" ? 2 : 8;
  }

  const kuaNumber = number as Exclude<number, 5>;
  return {
    number: kuaNumber,
    ...profiles[kuaNumber],
    note:
      "生年のみを使う簡易計算です。立春・旧暦の扱いなどにより、専門家の算出結果と異なる場合があります。",
  };
}
