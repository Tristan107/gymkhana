# Rules of the Game

## Overview & Board Layout

The game is played on an **11x11 grid** with fixed starting tokens arranged in a staggered pattern, similar to the game *Hex*.

- **Grid Dimensions:** 11 rows by 11 columns.
  - **Row 1** is the bottom row, **Row 11** is the top row.
  - **Column A** is the leftmost column, **Column K** is the rightmost column.
- **Adjacency:** All adjacencies, connections, and paths are calculated **orthogonally only** (Up, Down, Left, Right).
- **Token Reserves:** Each player starts with a limited supply of **20 playable tokens**.

### Initial board Model with chess-like coordinates
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

### Legend

- `R` = Fixed starting Red token (Red Player)
- `W` = Fixed starting White token (White Player)
- `.` = Playable empty space

---

## Gameplay Mechanics

- **First Move:** Red Player (RP) plays first. Players then alternate taking turns.
- **Placement Rule:** On their turn, a player places 1 token from their reserve onto a valid empty space (`.`):
  * **Red (`R`) Placement:** An empty space (`.`) is playable for Red **if and only** if it's not on col A or col K.
  * **White (`W`) Placement:** An empty space (`.`) is playable for White **if and only** it is not on row 1 or row 11.

*(Example: A9 is invalid for Red, while C11 is invalid for White.)*

---

## Win Conditions

The first player to fulfill **at least one** of their win conditions immediately wins the game:

### Red Player (RP) Wins by:

1. **Connection:** Creating a continuous, unbroken path of orthogonally connected `R` tokens connecting a token from **Row 1** to a token from **Row 11**.
2. **Surrounding ("Box-in"):** Completely surrounding a group of one or multiple `W` tokens (connected or not) by occupying all adjacent empty spaces (`.`) around that group with `R` tokens.

### White Player (WP) Wins by:

1. **Connection:** Creating a continuous, unbroken path of orthogonally connected `W` tokens connecting a token from **Col A** to a token from **Col K**.
2. **Surrounding ("Box-in"):** Completely surrounding a group of one or multiple `R` tokens (connected or not) by occupying all adjacent empty spaces (`.`) around that group with `W` tokens.

### Note on Board Edges
Empty cells on the edges (row 1, row 11, col A and col K) are ordinary spaces — they must still be occupied with your own tokens to complete a box-in; the boundary itself does not count as a closed side.
---

## End of Game & Draw Conditions

- **Draw:** If both players exhaust their supply of **20 playable tokens** without any player achieving a win condition, the game ends in a **Draw**.
