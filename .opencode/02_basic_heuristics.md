# AI Heuristic and Implementation Specification

This document provides a clear, natural language specification for building a rule-based AI for the game. It translates high-level strategy into an ordered decision pipeline, introducing chain defense mechanics and dual offensive/defensive pathing.

---

## 1. High-Level Strategy Overview

The AI evaluates its available moves using a strict priority order:

1. **Immediate Win (Offense):** Play a move that wins the game immediately.
2. **Immediate Block (Defense):** Block the opponent from winning on their next turn.
3. **Forced win near the edge (Offense):** Play a move that wins the game by partial box-in near the edge (no escape)
4. **Defend forced win near the edge (Defense):** Block the opponent to play a move that wins the game by partial box-in near the edge (no escape)
5. **Create a Double-Threat (Offense):** Set up a position from which the opponent cannot avoid a forced win.
6. **Block an Opponent Double-Threat (Defense):** Prevent the opponent from setting up a forced win.
7. **Strategic Path Expansion (Development):** Advance toward either a connection win or an encirclement ("box-in") win, with these goals:
  - Favor moves that extend your own chains.
  - Among these moves, favor moves that also cut the opponent's path (block their shortest connection line).
  - Don't extend a chain by playing Row 1/Row 11 for Red, or Col A/Col K for White, it is not enough offensive, these rows and cols must be played only to finish an inevitable box-in.

---

## 2. Rules and Special Definitions

### Opening Move
On the AI's first turn of the game, it chooses randomly from the playable squares adjacent to one of its target tokens on the edge **excluding between its home-lane cells** (Row 1 and Row 11 for Red, Column A and Column K for White). For red, it means AI has to play: Cols B, D, F, H, J on Row 10 or Row 2. For white, it means: Rows 2, 4, 6, 8, 10 on Col B or Col J.

### Double-Threat (Fork) Definition
A double-threat (fork) is a move by one player that forces a win. It can be a delayed forced win where this player still has to play 2 or 3 moves to win, they will 100% win if they keep alternating between defending immediate wins from the opponent, and playing these 2 or 3 moves which the opponent can no longer defend against.

---

## 3. Decision-Making Process Step-by-Step

On its turn, the AI evaluates its legal choices in this exact sequence (it does not evaluate subsequent steps once a condition has been fulfilled and a move has been played):

### Step 1: Check for an Immediate Win (Offensive move)
* The AI checks every legal move available to it.
* If any move immediately forms a complete connection (top-to-bottom for Red, left-to-right for White) or completely boxes in an opponent chain, the AI plays that move to win instantly.

### Step 2: Check for an Immediate Opponent Win (Defensive move)
* The AI simulates every move the opponent could legally play on their next turn.
* If the opponent has a move that wins immediately, the AI plays there to block them.

### Step 3: Check for a forced win near the edge (Offensive move)
* The AI checks every legal move available to it.
* If it will achieve a partial box-in near the edge, with only squares not playable by the opponent left to play to finish the box-in, the AI plays it to guarantee a win in a few moves.

### Step 4: Defend against a forced win near the edge (Defensive move)
* The AI simulates every opponent move.
* If one of these moves creates a 'forced win near the edge' scenario, the AI plays there to block it.

### Step 5: Create a Double-Threat (Offensive move)
* The AI simulates playing each of its legal moves.
* A move qualifies if it creates any of the following fork patterns: two immediate winning options on the next turn, one immediate and one delayed winning option, or two delayed winning options. The look ahead max depth is 3.

### Step 6: Block an Opponent Double-Threat (Defensive move)
* The AI simulates every opponent move. A move is an opponent fork if it satisfies the previous rule to "create a double threat", the AI plays it. Playing directly on the opponent's fork tile always neutralize the threat.

### Step 7: Strategic Path Expansion
* If none of the higher priorities apply, the AI chooses a move that advances the **connection** objective by extending an existing chain. Box-in progress is *not* chased here: forks and box-in opportunities arise naturally from connecting.
* **Opponent path block (dual-purpose):** Among the moves that achieve the above goal, favor those that cut the opponent's connection path (forcing the opponent to place extra tokens to complete their connection), otherwise just pick a random move that achieve the above goal.

---

## 4. Use Cases and Acceptance Criteria

### Check for an Immediate Win
#### Connection
```
UC1
Turn: red

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R . R R R . R .
 8 W . W . W R W . W . W
 7 . R W R . R . R . R .
 6 W W W . W R W . W W W
 5 . R . R R R . R W R .
 4 W . W R W . W W W W W
 3 . R . R . R . R . R .
 2 W . W R W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play F10 or H10.
```

#### Box-in
```
UC2
Turn: red

11   R . R . R . R . R  
10 W . W . W R W R W . W
 9 . R . R . R R R . R .
 8 W . W . W . W . W . W
 7 . R . R W R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R . R . R .
 4 W . W W W . W W W . W
 3 . R . R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play G11
```
### Check for an Immediate **Opponent** Win
```
UC3
Turn: white

11   R . R . R . R . R  
10 W . W . W R W . W . W
 9 . R . R . R R R . R .
 8 W . W . W W W R W . W
 7 . R . R W R . R . R .
 6 W . W W W . W R W . W
 5 . R . R . R . R . R .
 4 W . W . W . W R W . W
 3 . R W R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

White must play H2.
```
```
UC4
Turn: white

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R . R R R . R .
 8 W . W R W W W R W R W
 7 . R . R W R R R . R .
 6 W . W R W R W . W . W
 5 . R . R R R . R . R W
 4 W W W . W . W . W . W
 3 . R . R . R W R W R .
 2 W . W W W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

White must play E9.
```
### Check for a forced win near the edge
```
UC5
Turn: red

11   R . R . R . R . R  
10 W . W R W . W . W . W
 9 . R . R R R . R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R W R . R .
 4 W . W W W . W . W . W
 3 . R . R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play F10
```
```
UC5.1
Turn: red

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R . R . R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W W W W W . W . W
 5 . R . R R R . R W R .
 4 W . W W W R W W W . W
 3 . R . R R R R R . R .
 2 W . W R W W W R W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red has a forced win, he must play E1 -> G1 or G1 -> E1, no other possibilities.
```
### Defend against a forced win near the edge
```
UC6
Turn: white

11   R . R . R . R . R  
10 W . W R W . W . W . W
 9 . R . R R R . R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R W R . R .
 4 W . W . W . W . W . W
 3 . R . R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

White must play F10
```
### Create a Double-Threat
```
UC7
Turn: red

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R R R . R . R .
 8 W . W . W . W . W W W
 7 . R . R . R . R . R .
 6 W . W . W R W W W . W
 5 . R . R . R . R W R .
 4 W . W . W R W . W . W
 3 . R . R . R . R W R .
 2 W . W . W R W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play F8. This creates an immediate double threat to play either D10 or F10 and immediately win.
```

```
UC8
Turn: red

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R R R . R . R .
 8 W . W . W R W . W . W
 7 . R . R . R . R . R .
 6 W . W . W R W . W W W
 5 . R . R R R . R . R .
 4 W . W . W . W W W . W
 3 . R . R . R W R . R .
 2 W . W W W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play E7. This will create a double threat to play D6 or D8 and create an immediate win opportunity.
```
```
UC9
Turn: red

11   R . R . R . R . R  
10 W . W R W . W . W . W
 9 . R . R . R . R . R .
 8 W . W R W . W . W . W
 7 . R . R R R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R . R . R .
 4 W . W . W . W W W . W
 3 . R . R . R . R . R .
 2 W . W W W . W . W W W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play E9. This will creates an immediate win threat at F8, which must be defended, and a threat of delayed win playing F10 then E11.
```
```
UC10
Turn: red

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R R R R R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R . R . R .
 4 W . W W W . W . W . W
 3 . R . R . R W R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play F10. This will create 2 delayed threats : H10 and D10, both can't be defended simultaneously.
```
### Block an Opponent Double-Threat
```
UC11
Turn: white

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R R R . R . R .
 8 W . W . W . W . W W W
 7 . R . R . R . R . R .
 6 W . W . W R W W W . W
 5 . R . R . R . R W R .
 4 W . W . W R W . W . W
 3 . R . R . R . R . R .
 2 W . W . W R W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

White must play F8. This will defend  a double threat to play either D10 or F10 and immediately win.
```

```
UC12
Turn: white 

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R R R . R . R .
 8 W . W . W R W . W . W
 7 . R . R . R . R . R .
 6 W . W . W R W . W . W
 5 . R . R R R . R . R .
 4 W . W . W . W W W . W
 3 . R . R . R W R . R .
 2 W . W W W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

White must play E7 (D6 or D8 would be ok too). This will defend a double threat to play D6 or D8 and create an immediate win opportunity.
```
```
UC13
Turn: white

11   R . R . R . R . R  
10 W . W R W . W . W . W
 9 . R . R . R . R . R .
 8 W . W R W . W . W . W
 7 . R . R R R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R . R . R .
 4 W . W . W . W . W . W
 3 . R . R . R . R . R .
 2 W . W W W . W . W W W
 1   R . R . R . R . R  
   A B C D E F G H I J K

White must play E9. F8 or F10 would be ok too. This will defend a threat of immediate win opportunity in F8 which has to be defended, and a threat of delayed win playing F10 then E11.
```
```
UC14
Turn: white

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R R R R R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R . R . R .
 4 W . W . W . W . W . W
 3 . R . R . R W R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

White must play F10. H10 and D10 are ok too. This will defend 2 delayed threats : H10 and D10, both can't be defended simultaneously.
```
### Strategic Path Expansion
```
UC15
Turn: red

11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R . R . R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W R W . W . W
 5 . R . R . R . R . R .
 4 W . W . W . W W W . W
 3 . R . R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play F4 : it extends the existing red chain and cuts the White path.
```
```
UC16
Turn: red

11   R . R . R . R . R  
10 W . W R W . W . W . W
 9 . R . R . R . R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W . W W W . W
 5 . R . R . R . R . R .
 4 W . W . W . W . W . W
 3 . R . R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K

Red must play C9, D8 or E9 : this extends the existing Red chain.
```
