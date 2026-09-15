import type { ReactNode } from "react";

type MastheadProps = {
  title: string;
  titleLine2?: string;
  eyebrow: string;
  place?: string;
  mark?: ReactNode;
};

export function Masthead({ title, titleLine2, eyebrow, place, mark }: MastheadProps) {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <div className="brand">
          <p className="eyebrow">{eyebrow}</p>
          <h1>
            {title}
            {titleLine2 ? <span>{titleLine2}</span> : null}
          </h1>
          {place ? <p className="place">{place}</p> : null}
        </div>
        {mark}
      </div>
    </header>
  );
}

export function PublicMark() {
  return (
    <p className="masthead-mark">
      ICOS 2027
      <br />
      CC 2027
    </p>
  );
}
