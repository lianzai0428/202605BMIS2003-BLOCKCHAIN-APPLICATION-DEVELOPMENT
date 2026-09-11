export const ETH_TO_MYR_RATE =
  10324.05;


export function ethToMyr(
  ethAmount
) {
  if (
    ethAmount === undefined ||
    ethAmount === null ||
    ethAmount === ""
  ) {
    return null;
  }

  const value =
    Number(ethAmount) *
    ETH_TO_MYR_RATE;

  if (Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat(
    "en-MY",
    {
      style: "currency",
      currency: "MYR",
      maximumFractionDigits: 2,
    }
  ).format(value);
}


export function formatEthWithMyr(
  ethAmount
) {
  const myr =
    ethToMyr(ethAmount);

  if (!myr) {
    return `${ethAmount} ETH`;
  }

  return `${ethAmount} ETH (≈ ${myr})`;
}