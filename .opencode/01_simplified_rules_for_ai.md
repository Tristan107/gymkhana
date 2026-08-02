# Layout
This is a board game played on this 11x11 board, 11 rows and 11 columns, which can be modelized like this :

rows = [
" R.R.R.R.R ",
"W.W.W.W.W.W",
".R.R.R.R.R.",
"W.W.W.W.W.W",
".R.R.R.R.R.",
"W.W.W.W.W.W",
".R.R.R.R.R.",
"W.W.W.W.W.W",
".R.R.R.R.R.",
"W.W.W.W.W.W",
" R.R.R.R.R "
]

row n°1 is the top row and col n°1 is the left column

It's red player (rp) vs white player (wp), there are prepositionned tokens W belonging to wp and R belonging to rp on some squares as you can see. The '.' are the playable spots.

# Gameplay
rp plays the first move.

Each player take turn placing a R for rp or a W for wp replacing a '.'
A '.' is playable for W only if it connects 2 W (for example, row 1 col 3 is not playable for white)
A '.' is playable for R only if it connects 2 R (for example, row 2 col 1 is not playable for red)

# Win conditions
The winner is the first to :

For rp, either :
1. Connect a top R (first line) with a bottom R (last line) through a continuous path
2. Box-in a chain of W of any length (having a R on all adjacents '.' of the chain)

For wp, either :
1. Connect a left W (first column) with a right R (last column) through a continuous path
2. Box-in a chain of R of any length (having a W on all adjacents '.')
