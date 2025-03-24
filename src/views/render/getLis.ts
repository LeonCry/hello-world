export default function getLis(arr: number[]): number[] {
  if (arr.length === 0)
    return [];

  // dp[i] 表示以 arr[i] 结尾的最长递增子序列的长度
  const dp = Array.from({ length: arr.length }).fill(1) as number[];
  // prev[i] 表示以 arr[i] 结尾的最长递增子序列的前驱索引
  const prev = Array.from({ length: arr.length }).fill(-1) as number[];

  for (let i = 1; i < arr.length; i++) {
    for (let j = 0; j < i; j++) {
      if (arr[i] > arr[j] && dp[i] < dp[j] + 1) {
        dp[i] = dp[j] + 1;
        prev[i] = j;
      }
    }
  }

  // 找到最长递增子序列的长度和对应的索引
  let maxLength = 0;
  let maxIndex = -1;
  for (let i = 0; i < dp.length; i++) {
    if (dp[i] > maxLength) {
      maxLength = dp[i];
      maxIndex = i;
    }
  }

  // 通过 prev 数组回溯还原最长递增子序列的索引
  const lisIndices: number[] = [];
  while (maxIndex !== -1) {
    lisIndices.unshift(maxIndex);
    maxIndex = prev[maxIndex];
  }

  return lisIndices;
}
