# Rules of the Game

## Overview & Board Layout

The game is played on an **11x11 grid** with fixed starting tokens arranged in a staggered pattern.

- **Grid Dimensions:** 11 rows by 11 columns.
  - **Row 1** is the bottom row, **Row 11** is the top row.
  - **Column A** is the leftmost column, **Column K** is the rightmost column.
- **Adjacency:** All connections, paths, and adjacent spaces are calculated orthogonally only (up, down, left, right).
- **Token Reserves:** Each player starts with a limited supply of **20 playable tokens**.

Note : Fixed initial tokens are separate from the 20 reserve tokens. Fixed initial tokens count for chains, connections, and loops.

### Initial Board Setup with Chess-like Coordinates

```
11   R . R . R . R . R  
10 W . W . W . W . W . W
 9 . R . R . R . R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W . W . W . W
 5 . R . R . R . R . R .
 4 W . W . W . W . W . W
 3 . R . R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K
```
Which translates as :

Red fixed tokens: odd rows, columns B,D,F,H,J.
White fixed tokens: even rows, columns A,C,E,G,I,K.
Corners A1, A11, K1, K11 do not exist.

### Legend

- `R` = Fixed starting Red token (Red Player)
- `W` = Fixed starting White token (White Player)
- **.** = Empty playable square.
- **Corners:** The four corner squares (A1, A11, K1, K11) do not exist as nodes for any purpose — they cannot hold a token, and they cannot be passed through, adjacent-counted, or landed on for any path, chain, or connectivity check. For win-condition purposes, "reaching Column A" or "reaching Column K" means reaching any playable square in that column (i.e., excluding the corner squares), and likewise "reaching Row 1" or "reaching Row 11" means reaching any playable square in that row.

---

## Gameplay Mechanics

- **First Move:** The Red Player (RP) plays first. Players then alternate taking turns.
- **Placement Rule:** On their turn, a player places 1 token from their reserve onto a valid empty space (`.`):
  - **Red (`R`) Placement:** An empty space (`.`) is playable for Red **if and only if** it is not on Column A or Column K.
  - **White (`W`) Placement:** An empty space (`.`) is playable for White **if and only if** it is not on Row 1 or Row 11.
  Tokens remain fixed on their square for the rest of the game. Initial fixed R/W tokens are treated identically to reserve-placed tokens for purposes of chains and connections.

---

## Win Conditions

The first player to fulfill **at least one** of their win conditions immediately wins the game (after each move, the active player checks their own win conditions) :

### Red Player (RP) Wins by:

- **Option 1 (Connection):** Creating a continuous chain of orthogonally connected `R` tokens from **Row 1** to **Row 11**.  
*OR*
- **Option 2 (Enclosing / "Boxing in"):** Completely enclosing a set of one or more `W` tokens with a continuous loop (a chain that closes back on itself) of orthogonally connected `R` tokens.

### White Player (WP) Wins by:

- **Option 1 (Connection):** Creating a continuous chain of orthogonally connected `W` tokens from **Column A** to **Column K**.  
*OR*
- **Option 2 (Enclosing / "Boxing in"):** Completely enclosing a set of one or more `R` tokens with a continuous loop (a chain that closes back on itself) of orthogonally connected `W` tokens.

Notes: A valid enclosure must consist entirely of the active player's tokens; board edges cannot be used to complete a surrounding loop. The loop must be a simple cycle of orthogonal edges. The enclosed set can be any non-empty subset of opponent tokens.

### Examples / Acceptance criteria
#### White wins by box-in:
```
11   R . R . R . R . R  
10 W . W . W W W W W . W
 9 . R R R W R . R W R .
 8 W . W . W R W . W . W
 7 . R R R W R R R W R .
 6 W . W R W . W W W . W
 5 . R . R W R W R . R .
 4 W R W . W W W . W R W
 3 . R R R . R R R . R .
 2 W . W . W . W . W R W
 1   R . R . R . R . R  
   A B C D E F G H I J K
```
#### White wins by connection:
```
11   R . R . R . R . R  
10 W . W W W W W . W . W
 9 . R W R . R W R . R .
 8 W . W . W . W W W R W
 7 . R W R R R . R W R .
 6 W W W . W . W . W . W
 5 . R R R . R R R W R .
 4 W . W R W . W . W W W
 3 . R R R R R . R R R .
 2 W . W . W R W R W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K
```
#### Red wins by connection:
```
11   R . R . R . R . R  
10 W . W . W R W . W . W
 9 . R . R R R . R W R .
 8 W . W R W . W . W W W
 7 . R R R . R . R W R .
 6 W R W . W . W W W . W
 5 . R . R . R . R . R .
 4 W R W . W . W W W W W
 3 . R R R . R . R W R .
 2 W . W R W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K
```
#### Here, Red has not won yet. The box-in needs to be completed on Red's next turn by playing G11. White can still win if they achieve an immediate win condition this turn.
```
11   R . R . R . R . R  
10 W . W . W R W R W . W
 9 . R . R . R R R . R .
 8 W . W . W . W . W . W
 7 . R W R . R . R . R .
 6 W . W . W . W . W . W
 5 . R . R W R . R . R .
 4 W . W . W . W . W . W
 3 . R . R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K
```
#### This is NOT a box-in situation, R in F11 is not boxed-in because "Board edges cannot be used to complete a surrounding loop. The loop must be a simple cycle of orthogonal edges."
```
11   R . R W R W R . R  
10 W . W . W W W . W . W
 9 . R . R . R . R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W R W . W . W
 5 . R . R . R . R . R .
 4 W . W . W R W . W . W
 3 . R . R . R R R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R  
   A B C D E F G H I J K
```

---

## End of Game & Draw Conditions

- **Draw:** The game ends in a draw immediately after the turn in which the second player places their 20th token, if no win condition has been met.
- **No Stalemates:** Each player individually has access to 49 of the 57 empty squares under their own placement rule. Since 49 exceeds the maximum 20 placements a player will ever make, no player can be blocked from placing before their reserve is exhausted.
