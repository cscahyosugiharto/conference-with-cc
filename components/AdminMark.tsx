"use client";

import Link from "next/link";

export function AdminMark({ loggedIn, onLogout }: { loggedIn: boolean; onLogout: () => void }) {
  return (
    <div className="masthead-actions">
      <Link className="btn btn-ghost-light" href="/">
        Public seating
      </Link>
      {loggedIn ? (
        <button className="btn btn-ghost-light" type="button" onClick={onLogout}>
          Log out
        </button>
      ) : null}
    </div>
  );
}
