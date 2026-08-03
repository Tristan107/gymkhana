# Rules of the Game

## Overview & Board Layout

The game is played on an **11x11 grid** with fixed starting tokens arranged in a staggered pattern, similar to the game *Hex*.

- **Grid Dimensions:** 11 rows by 11 columns.
  - **Row 1** is the top row, **Row 11** is the bottom row.
  - **Column 1** is the leftmost column, **Column 11** is the rightmost column.
- **Adjacency:** All adjacencies, connections, and paths are calculated **orthogonally only** (Up, Down, Left, Right).
- **Token Reserves:** Each player starts with a limited supply of **20 playable tokens**.

### Board Model
```
Row 01:   R . R . R . R . R  
Row 02: W . W . W . W . W . W
Row 03: . R . R . R . R . R .
Row 04: W . W . W . W . W . W
Row 05: . R . R . R . R . R .
Row 06: W . W . W . W . W . W
Row 07: . R . R . R . R . R .
Row 08: W . W . W . W . W . W
Row 09: . R . R . R . R . R .
Row 10: W . W . W . W . W . W
Row 11:   R . R . R . R . R  
```

### Legend

- `R` = Fixed starting Red token (Red Player)
- `W` = Fixed starting White token (White Player)
- `.` = Playable empty space

---

## Gameplay Mechanics

- **First Move:** Red Player (RP) plays first. Players then alternate taking turns.
- **Placement Rule:** On their turn, a player places 1 token from their reserve onto a valid empty space (`.`):
  * **Red (`R`) Placement:** An empty space (`.`) is playable for Red **only if** it is orthogonally adjacent to **at least two `R` tokens**.
  * **White (`W`) Placement:** An empty space (`.`) is playable for White **only if** it is orthogonally adjacent to **at least two `W` tokens**.

*(Example: Row 2, Col 1 is initially invalid for Red, while Row 1, Col 3 is initially invalid for White.)*

---

## Win Conditions

The first player to fulfill **at least one** of their win conditions immediately wins the game:

### Red Player (RP) Wins by:

1. **Connection:** Creating a continuous, unbroken path of orthogonally connected `R` tokens connecting the **Top Row (Row 1)** to the **Bottom Row (Row 11)**.
2. **Surrounding ("Box-in"):** Completely surrounding a connected group of `W` tokens of any length by occupying all adjacent empty spaces (`.`) around that group with `R` tokens.
   * *Note on Board Edges:* The board boundary acts as a virtual wall (tokens touching the edge lose that direction of movement), but the encircling player must still fully close off all remaining open adjacent spaces with their own tokens.

### White Player (WP) Wins by:

1. **Connection:** Creating a continuous, unbroken path of orthogonally connected `W` tokens connecting the **Leftmost Column (Col 1)** to the **Rightmost Column (Col 11)**.
2. **Surrounding ("Box-in"):** Completely surrounding a connected group of `R` tokens of any length by occupying all adjacent empty spaces (`.`) around that group with `W` tokens.
   * *Note on Board Edges:* The board boundary acts as a virtual wall, but the encircling player must still fully close off all remaining open adjacent spaces with their own tokens.

---

## End of Game & Draw Conditions

- **Draw:** If both players exhaust their supply of **20 playable tokens** without any player achieving a win condition, the game ends in a **Draw**.
