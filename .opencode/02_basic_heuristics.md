# AI Heuristic and Implementation Specification

This document provides a clear, natural language specification for building a rule-based AI for the game. It translates high-level strategy into an ordered decision pipeline, introducing chain defense mechanics and dual offensive/defensive pathing.

---

## 1. High-Level Strategy Overview

The AI evaluates its available moves using a strict six-tier priority order:

1. **Immediate Win (Offense):** Play a move that wins the game immediately.
2. **Immediate Block (Defense):** Block the opponent from winning on their next turn.
3. **Create a Double-Threat (Offense):** Set up two separate winning moves for the next turn so the opponent cannot block both.
4. **Block an Opponent Double-Threat (Defense):** Prevent the opponent from setting up two unstoppable winning paths.
5. **Defend Single-Liberty Chains (Defense):** Save any friendly token or chain that only has one remaining liberty.
6. **Strategic Path Expansion (Development):** Advance toward either a connection win or an encirclement ("box-in") win, choosing the shortest path to victory.

---

## 2. Rules and Special Definitions

### Opening Move
On the AI's first turn of the game, it chooses randomly among all legal spaces currently available for its color.

### Double-Threat (Fork) Definition
* A double-threat occurs when a single move creates **two or more separate winning moves** for the next turn. Because the opponent can only play one token per turn, they cannot block both spaces, guaranteeing a win on the following turn.

### Liberties Definition
* A **liberty** is defined as any playable empty space that is directly adjacent (up, down, left, or right) to a specific token or connected chain of tokens.
* If a friendly chain is reduced to **exactly one liberty**, it is in immediate danger of being boxed in or cut off, making its preservation a high defensive priority.

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
* If playing a specific move gives the AI two different immediate winning options on the next turn, the AI plays that move.

### Step 4: Block an Opponent Double-Threat
* The AI checks if the opponent is one move away from setting up a double-threat.
* If such a threat is found, the AI plays in the key intersecting space to prevent the opponent from creating it.

### Step 5: Defend Single-Liberty Chains
* The AI inspects all of its own placed tokens and connected chains.
* If any friendly chain has **only one liberty left**, the AI must play in that single liberty space to increase the chain's liberties back to two or more, preventing it from being captured or trapped.

### Step 6: Strategic Path Expansion (Shortest Way to Victory)
* If none of the higher priorities apply, the AI chooses a move that actively advances toward a win condition. It evaluates two strategies:
  1. **Connection Progress:** Playing on a space that extends existing connected chains to reduce the total number of additional tiles needed to complete the top-bottom (Red) or left-right (White) path.
  2. **Box-in Progress:** Playing on a space that removes a liberty from an opponent chain, bringing that chain closer to being completely surrounded.
* **Selection Criteria:** The AI measures the remaining steps required for both strategies (count of tiles needed to complete a full connection vs. count of tiles needed to complete a box-in) and chooses the option with the **shortest path to victory**.

---

## 4. Tie-Breaking Strategy

If multiple candidate moves result in the exact same shortest path distance during strategic expansion:
1. **Random Fallback:** If moves remain completely equal, the AI selects one uniformly at random.
