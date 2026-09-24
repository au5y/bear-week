import { useEffect } from "react";

import type { Bear, Snapshot } from "../types";
import { bearMap } from "../lib/bracket";
import { BearAvatar } from "../components/BearAvatar";
import { Confetti } from "../components/Confetti";
import { PawPrint } from "../components/PawPrint";
import { CreditFooter } from "../components/Disclosure";
import { Leaderboard } from "../components/Leaderboard";
import { useFitScale } from "../hooks/useFitScale";
import { useMediaQuery } from "../hooks/useMediaQuery";
import "./ChampionReveal.css";

/** Matches the TV bracket: wide enough to be a television, so pin and fit. */
const WIDE = "(min-width: 861px)";

/** Full-screen celebration for the TV. Trophy, confetti, enormous bear. */
export function ChampionReveal({
  bear,
  snapshot,
}: {
  bear: Bear;
  snapshot: Snapshot;
}) {
  const bears = bearMap(snapshot);
  const wide = useMediaQuery(WIDE);

  useEffect(() => {
    if (!wide) return;
    document.body.classList.add("is-locked");
    return () => document.body.classList.remove("is-locked");
  }, [wide]);

  // The road to the crown: who this bear beat, round by round.
  const victories = snapshot.rounds
    .map((round) => {
      const matchup = round.matchups.find((item) => item.winner === bear.id);
      if (!matchup) return null;

      if (matchup.isBye || !matchup.bearB) {
        return { round: round.name, note: "walked in on a bye" };
      }

      const loserId = matchup.bearA === bear.id ? matchup.bearB : matchup.bearA;
      const loser = bears.get(loserId);
      const mine = matchup.votes[bear.id] ?? 0;
      const theirs = matchup.votes[loserId] ?? 0;

      return {
        round: round.name,
        note: `beat ${loser?.displayName ?? "a rival"} ${mine}–${theirs}`,
      };
    })
    .filter(
      (entry): entry is { round: string; note: string } => entry !== null,
    );

  // The card is centred rather than full-bleed, so it shrinks in place instead
  // of being widened to match -- see the `widen` argument.
  const { boxRef, contentRef, scale } = useFitScale<
    HTMLDivElement,
    HTMLDivElement
  >(
    wide,
    `${bear.id}|${victories.length}|${snapshot.leaderboard.length}|${wide}`,
    false,
  );

  return (
    <div className={`champ ${wide ? "champ--fit" : ""}`.trim()}>
      <Confetti active />

      <div className="champ__fitbox" ref={boxRef}>
        <div
          className="champ__inner"
          ref={contentRef}
          style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
        >
          <div className="champ__crown" aria-hidden="true">
            🏆
          </div>

          <p className="champ__kicker">
            <PawPrint size={22} color="var(--bark)" />
            2025 Fat Bear Champion
            <PawPrint size={22} color="var(--bark)" />
          </p>

          <div className="champ__portrait">
            <BearAvatar bear={bear} size="min(30vh, 34vw)" />
          </div>

          <h1 className="champ__name">{bear.displayName}</h1>
          <p className="champ__title">{bear.title}</p>
          <p className="champ__bio">{bear.bio}</p>

          {victories.length > 0 && (
            <ul className="champ__road">
              {victories.map((entry) => (
                <li key={entry.round} className="champ__roadrow">
                  <span className="champ__roadround">{entry.round}</span>
                  <span className="champ__roadnote">{entry.note}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="champ__board">
            <Leaderboard
              entries={snapshot.leaderboard}
              scoredMatchups={snapshot.scoredMatchups}
              limit={5}
              title="Final standings"
            />
          </div>

          <p className="champ__signoff">
            Undisputed. Unbothered. Deeply, gloriously round.
          </p>
        </div>
      </div>

      <CreditFooter variant="tv" />
    </div>
  );
}
