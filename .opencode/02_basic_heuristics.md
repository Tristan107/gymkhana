# AI Heuristic and Implementation Specification

This document provides a clear, natural language specification for building a rule-based AI for the game. It translates high-level strategy into an ordered decision pipeline, introducing chain defense mechanics and dual offensive/defensive pathing.

---

## 1. High-Level Strategy Overview

The AI evaluates its available moves using a strict six-tier priority order:

1. **Immediate Win (Offense):** Play a move that wins the game immediately.
2. **Immediate Block (Defense):** Block the opponent from winning on their next turn.
2.b ** Forced win near the edge:** Play a move that wins the game by partial box-in near the edge (no escape)
2.c ** Defend forced win near the edge:** Block the opponent to play a move that wins the game by partial box-in near the edge (no escape)
3. **Create a Double-Threat (Offense):** Set up a position from which the opponent cannot avoid a forced win.
4. **Block an Opponent Double-Threat (Defense):** Prevent the opponent from setting up a forced win.
5. **Defend Single-Liberty Chains (Defense):** Save any friendly token or chain that only has one remaining playable liberty.
6. **Strategic Path Expansion (Development):** Advance toward either a connection win or an encirclement ("box-in") win, choosing the shortest path to victory, then favoring moves that also cut the opponent's path (block their shortest connection line) while keeping every own chain healthy.

---

## 2. Rules and Special Definitions

### Opening Move
On the AI's first turn of the game, it chooses randomly among all legal spaces currently available for its color, **excluding its home-lane cells** (row 1 and row 11 for Red, column A and column K for White). Home-lane cells are only ever useful as the final touches of a box-in; there is no point opening on them.

### Playable Liberty vs. Open Neighbor
A chain's safety must be evaluated only through **playable liberties** — never through the raw number of adjacent empty cells.

* **Playable liberty:** an adjacent empty cell that the chain's own color **may legally occupy** (White may not play row 1 or row 11; Red may not play column A or column K).

**Safety rules:**
* Keep every own chain at **two or more playable liberties**. A chain with exactly one playable liberty is in immediate danger; a chain with zero playable liberties is effectively dead.

### Double-Threat (Fork) Definition
A double-threat (fork) is a move by one player that forces a win. It comes in two forms:

1. **Two winning moves:** the move creates **two or more separate immediate winning moves** for the next turn. The opponent can only play once, so one win survives.
2. **Two trapped chains:** the move leaves **two or more of the opponent's chains with exactly one playable liberty each** (and each chain boxable, i.e. no corner open neighbor). The opponent saves one chain with their next move; the fork's owner then plays the other chain's last playable liberty, and subsequently fills that chain's forbidden-line open neighbor(s) to box it — a win the opponent cannot prevent.

Form 2 is easy to miss because it creates **no immediate winning move**; it wins two plies later.

### Critical Shared-Liberty Cell
* A **shared-liberty cell** is an empty cell that is an open neighbor of **two or more** of the opponent's chains.
* A shared-liberty cell is **critical** when occupying it would leave those chains with only their forbidden-line neighbors as open neighbors (i.e., each such chain drops to exactly one playable liberty, and all other open neighbors are on the opponent's forbidden lines). Occupying it creates an unstoppable form-2 fork.
* **Action rule:** contest critical shared-liberty cells yourself, or pre-fill one chain's non-shared playable liberty so that the cell can threaten at most one chain.

---

## 3. Decision-Making Process Step-by-Step

On its turn, the AI evaluates its legal choices in this exact sequence:

### Step 1: Check for an Immediate Win
* The AI checks every legal move available to it.
* If any move immediately forms a complete connection (top-to-bottom for Red, left-to-right for White) or completely boxes in an opponent chain, the AI plays that move to win instantly.

### Step 2: Check for an Immediate Opponent Win
* The AI simulates every move the opponent could legally play on their next turn.
* If the opponent has a move that wins immediately, and that space is also a legal move for the AI, the AI plays there to block them.

### Step 3: Create a Double-Threat
* The AI simulates playing each of its legal moves.
* A move qualifies if it creates **either fork form**: two immediate winning options on the next turn, **or** two or more of the opponent's chains with exactly one playable liberty (all boxable). The AI plays the first such move found.
* When form 2 is used, verify the trapped chains are genuinely boxable: after the AI later fills their last playable liberty, every remaining open neighbor must be playable by the AI (no corner escapes).

### Step 4: Block an Opponent Double-Threat
* The AI simulates every opponent move. A move is an opponent fork if it satisfies **either fork form** (two immediate wins, or two of the AI's own chains dropped to exactly one playable liberty).
* For every opponent fork, the AI builds a list of candidate blocking moves, in priority order:
  1. The fork cell itself (the move the opponent would play), if legal for the AI.
  2. Cells that support both immediate winning moves (when form 1).
  3. The single playable liberties of the threatened chains (when form 2) — occupying one extends that chain and restores its liberties.
* The AI plays the first candidate that is safe: after playing it, the opponent has **no immediate winning move and no remaining fork** of either form.

### Step 5: Defend Single-Liberty Chains
* The AI inspects all of its own placed tokens and connected chains.
* If any friendly chain has **only one playable liberty left**, the AI must play in that single liberty space to extend the chain and restore its liberties, preventing it from being captured or trapped. (Note: this step fires only when the chain is *already* at one playable liberty; Step 4 must catch forks that would *create* that condition.)

### Step 6: Strategic Path Expansion (Shortest Way to Victory)
* If none of the higher priorities apply, the AI chooses a move that advances the **connection** objective — the space that reduces the total number of additional tiles needed to complete the top-bottom (Red) or left-right (White) path. Box-in progress is *not* chased here: forks and box-in opportunities arise naturally from connecting.
* **Home-lane cells** (row 1/row 11 for Red, column A/column K for White) are excluded from consideration unless they are the **last liberties of a boxable opponent group** (a chain with two or fewer playable liberties whose remaining open neighbors are all attacker-occupiable, so it cannot extend). If every legal move is a home-lane cell, the AI falls back to them.
* **Zigzag preference:** among moves with the same connection distance, prefer the move that leaves the fewest own-token adjacencies aligned with the travel axis (vertical runs for Red, horizontal runs for White). A straight column of N tiles has N-1 such edges while a zigzag staircase has only about half, so minimizing them demotes straight ladders and produces a weaving path that creates more forks and box-ins.
* **Opponent path block (dual-purpose):** among moves with the same connection distance, first prefer the move that maximizes the opponent's connection distance (the number of tiles they still need to connect their home lines). Placing on a cell that lies on the opponent's shortest path cuts their line while advancing your own, so every strategic move both attacks and defends.
* **Health tie-break:** among moves equal on connection distance and opponent-path-block score, prefer the move that leaves the fewest of the AI's own chains with exactly one playable liberty (ideally zero). This pre-empts form-2 forks before Step 4 can even be reached.
* **Box-in as last tie-break:** only when connection distance, opponent-path-block score, zigzag score, and health all tie does the AI consider box-in progress.

---

## 4. Pre-Move Danger Check (performed before committing any strategic move)

Regardless of which step selects the move, run this mechanical checklist on the current position to avoid missing a form-2 fork:

1. Enumerate every own chain with **two or fewer playable liberties**.
2. For each, note any open neighbors that lie on your own forbidden lines (these are box points, not defenses).
3. Is there a single opponent move that is an open neighbor of **two or more** such chains and, if played, would leave each of them at exactly one playable liberty? If yes → this is a critical shared-liberty cell; play it, or pre-fill one chain's liberty so only one chain is ever threatened.
4. Never rely on forbidden-line neighbors as defense, and never assume a chain is safe because it "has empty space around it" — count only playable liberties.

---

## 5. Tie-Breaking Strategy

If multiple candidate moves result in the exact same connection distance during strategic expansion:
1. **Opponent Path Block:** Prefer the move that maximizes the opponent's connection distance (cuts their shortest line), making each move both attack and defense.
2. **Zigzag:** Prefer the move that leaves the fewest own-token adjacencies along the travel axis (straight ladders are demoted in favor of a weaving path).
3. **Chain Health:** Prefer the move that minimizes the number of the AI's own chains left with exactly one playable liberty.
4. **Box-in Progress:** Prefer the move that reduces the tiles needed to complete a box-in (used only as a final tie-break; boxes are otherwise expected to emerge naturally).
5. **Random Fallback:** If moves remain completely equal, the AI selects one uniformly at random.

---

## 6. Worked Example: Critical Shared-Liberty Fork

Position `01_fork_detection_1`, White to move:

```
11   R . R . R . R . R
10 W . W . W . W . W . W
 9 . R . R . R . R . R .
 8 W W W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R . R . R .
 4 W . W . W . W . W . W
 3 . R . R R R R R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R
   A B C D E F G H I J K
```

Red has placed E3 and G3 (grid rows 8, cols 4 and 6), which together with the fixed pegs D3, F3, H3 form the horizontal chain D3–H3 directly above the fixed White pegs E2 (grid 9,4) and G2 (grid 9,6).

* E2's open neighbors: E3 (Red), E1 (grid row 10, **not playable for White**), D2, F2.
* G2's open neighbors: G3 (Red), G1 (grid row 10, **not playable for White**), F2, H2.
* **F2 is a critical shared-liberty cell:** it is an open neighbor of both E2 and G2. If Red plays F2, E2's only playable liberty is D2 and G2's only playable liberty is H2 — both at exactly one playable liberty, with their other open neighbors (E1, G1) on White's forbidden row. That is a form-2 fork: White saves one chain, Red fills the other's last liberty and then boxes it through E1 or G1.

White's only moves that avoid this forced loss are:
* **F2** — occupy the critical cell itself, joining E2–G2 into one safe chain.
* **D2** — extend E2's chain upward, restoring its liberties (B2, C3) so F2 can threaten only G2.
* **H2** — the mirror of D2 for G2.

Every other White move loses: after Red F2, White can save only one of the two chains. The AI must find F2 (or D2/H2) via Step 4, using the playable-liberty definition and the form-2 fork rule — a position where counting total empty neighbors would wrongly report both chains as "safe."
