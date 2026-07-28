"use client";

const VOTER_ID_KEY = "rt-voter-id";
const VOTER_NAME_KEY = "rt-voter-name";

/** Stable anonymous id for vote attribution within a browser. */
export function getVoterId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(VOTER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID().slice(0, 8);
    localStorage.setItem(VOTER_ID_KEY, id);
  }
  return id;
}

export function getVoterDisplayName(): string {
  if (typeof window === "undefined") return "Guest";
  const stored = localStorage.getItem(VOTER_NAME_KEY)?.trim();
  if (stored) return stored;
  return `Guest ${getVoterId().slice(-4)}`;
}

export function setVoterDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) {
    localStorage.setItem(VOTER_NAME_KEY, trimmed);
  } else {
    localStorage.removeItem(VOTER_NAME_KEY);
  }
}
