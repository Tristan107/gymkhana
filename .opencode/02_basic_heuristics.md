# Intro
Here are basic heuristics to implement for a computer player.

# Basic algo

For first move, play anywhere randomly.

For other moves :
If a '.' gives victory, play it
Else if a '.' gives victory to opponent, play it to defend
Else if a '.' gives a 2-way victory next turn (not defendable), play it
Else if a '.' gives the opponent a 2-way victory next turn (not defendable), play it
Else play on any '.' which extends already connected tiles.

# Heuristics
Keep in mind row 1 and row 11 are not playable for wp.
Keep in mind col 1 and col 11 are not playable for rp.

So let's say you play rp, if you allow wp to surround your tiles close to the edge (for example, like this :
rows = [
" R.R.R.R.R ",
"W.W.W.W.WWW",
".R.R.R.RWR.",
"W.W.W.W.WWW",
".R.R.R.R.R.",
"W.W.W.W.W.W",
".R.R.R.R.R.",
"W.W.W.W.W.W",
".R.R.R.R.R.",
"W.W.W.W.W.W",
" R.R.R.R.R "
]
) there is no way you can prevent the box-in, so you must detect this possibility before it happens (you can call it "edge trap")

When you check for your opponent possible moves, you can limit yourself to the '.' around already connected opponent tiles.
