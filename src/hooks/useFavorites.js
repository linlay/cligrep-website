import { useEffect, useState } from "react";
import { request } from "../lib/api.js";

export function useFavorites() {
  const [favoriteState, setFavoriteState] = useState(() => {
    const raw = localStorage.getItem("cligrep-favorites");
    return raw ? JSON.parse(raw) : {};
  });

  useEffect(() => {
    localStorage.setItem("cligrep-favorites", JSON.stringify(favoriteState));
  }, [favoriteState]);

  function isFavorite(slug) {
    return favoriteState[slug] === true;
  }

  async function toggleFavorite(cliSlug, userId) {
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
