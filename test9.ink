EXTERNAL min(a, b)
EXTERNAL max(a, b)
VAR x = 5
VAR y = 10
-> start
=== start ===
~ x = min(x + 3, y)
~ x = max(x - 10, 0)
Result is {x}.
-> END
