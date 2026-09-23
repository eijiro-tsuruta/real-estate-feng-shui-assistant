export const wallTargets = ["interior_wall", "exterior_wall", "front_door"] as const;
export type WallTarget = (typeof wallTargets)[number];
export const wallMethods = ["words", "reference", "ai"] as const;
export type WallMethod = (typeof wallMethods)[number];

export type WallImageState = {
  target?: WallTarget;
  method?: WallMethod;
  description?: string;
};

export function encodeWallImageState(state: WallImageState): string {
  return JSON.stringify(state);
}

export function parseWallImageState(value: string | null): WallImageState {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as WallImageState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function parseWallTargetPostback(data?: string): WallTarget | null {
  const match = /^wall_target=(interior_wall|exterior_wall|front_door)$/.exec(data ?? "");
  return (match?.[1] as WallTarget | undefined) ?? null;
}

export function parseWallMethodPostback(data?: string): WallMethod | null {
  const match = /^wall_method=(words|reference|ai)$/.exec(data ?? "");
  return (match?.[1] as WallMethod | undefined) ?? null;
}

export function wallTargetLabel(target: WallTarget): string {
  return { interior_wall: "室内の壁", exterior_wall: "建物の外壁", front_door: "玄関ドア" }[target];
}
