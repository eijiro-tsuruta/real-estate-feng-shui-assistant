export function isLiveAnalysisEnabled(
  nodeEnv: string | undefined,
  ...enabledFlags: Array<string | undefined>
): boolean {
  if (nodeEnv !== "production") return true;
  return (
    enabledFlags.length > 0 &&
    enabledFlags.every((enabledFlag) => enabledFlag === "true")
  );
}
