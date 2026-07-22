"use client";

import { UserButton } from "@clerk/nextjs";

export function UserMenu() {
  return (
    <UserButton
      appearance={{
        elements: {
          userButtonAvatarBox: "size-8",
          userButtonTrigger: "focus:shadow-none",
        },
      }}
    />
  );
}
