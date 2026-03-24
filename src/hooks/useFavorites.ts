import { useEffect, useState } from "react";
import { request } from "../lib/api";

type FavoriteState = Record<string, boolean>;

function readStoredFavorites(): FavoriteState {
  try {
    const raw = localStorage.getItem("cligrep-favorites");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FavoriteState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useFavorites() {
  const [favoriteState, setFavoriteState] = useState<FavoriteState>(() => readStoredFavorites());

  useEffect(() => {
    localStorage.setItem("cligrep-favorites", JSON.stringify(favoriteState));
  }, [favoriteState]);

  function isFavorite(slug: string): boolean {
    return favoriteState[slug] === true;
  }

  async function toggleFavorite(cliSlug: string, userId: number | string): Promise<boolean> {
    const nextActive = !favoriteState[cliSlug];
    await request("/api/v1/favorites", {
      method: "POST",
      body: JSON.stringify({ userId, cliSlug, active: nextActive }),
    });
    setFavoriteState((current) => ({ ...current, [cliSlug]: nextActive }));
    return nextActive;
  }

  return { favoriteState, isFavorite, toggleFavorite };
}
