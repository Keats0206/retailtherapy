import PrototypeProfileClient from "./prototype-profile-client";

export const metadata = {
  title: "profile setup · prototype — frontrow",
};

/**
 * Profile setup, prototype edition. The form a first-time signup sees on
 * /home, with persistence faked so it runs without a database or an account.
 */
export default function PrototypeProfilePage() {
  return <PrototypeProfileClient />;
}
