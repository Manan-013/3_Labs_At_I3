// ===== Code tickets (Python). tier = minimum night it can appear on =====
// type "mc": pick the right choice (answer = index)
// type "fix": type the corrected line / expression (answers compared ignoring spaces)
const PUZZLES = [
  // ---------- Tier 1: syntax & basic logic ----------
  { tier: 1, type: "fix", title: "BUG HUNTER", prompt: "The loop crashes with IndexError. Type the fixed first line.",
    code: "for i in range(len(arr) + 1):\n    total += arr[i]", bad: 0,
    answers: ["for i in range(len(arr)):"] },
  { tier: 1, type: "fix", title: "BUG HUNTER", prompt: "SyntaxError on line 1. Type the fixed line.",
    code: "if power < 20\n    alert()", bad: 0, answers: ["if power < 20:"] },
  { tier: 1, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "x = 7\nx += 3\nx *= 2\nprint(x)", choices: ["17", "20", "13", "14"], answer: 1 },
  { tier: 1, type: "fix", title: "BUG HUNTER", prompt: "Comparison bug. Type the fixed line.",
    code: "if door = 'closed':\n    hold()", bad: 0, answers: ["if door == 'closed':", 'if door == "closed":'] },
  { tier: 1, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "print(10 // 3, 10 % 3)", choices: ["3 1", "3.33 1", "3 0", "1 3"], answer: 0 },
  { tier: 1, type: "fix", title: "BUG HUNTER", prompt: "NameError: 'Print' is not defined. Type the fixed line.",
    code: "Print('gate sealed')", bad: 0, answers: ["print('gate sealed')", 'print("gate sealed")'] },
  { tier: 1, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "s = 'I3LAB'\nprint(s[1])", choices: ["I", "3", "L", "error"], answer: 1 },
  { tier: 1, type: "mc", title: "LOGIC CHECK", prompt: "Which value is falsy in Python?",
    code: "# pick the one that makes `if x:` skip", choices: ["'0'", "[0]", "0", "' '"], answer: 2 },

  // ---------- Tier 2: arrays & strings ----------
  { tier: 2, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "a = [4, 8, 15, 16, 23, 42]\nprint(a[-2])", choices: ["16", "23", "42", "15"], answer: 1 },
  { tier: 2, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "print('deadlock'[::-1])", choices: ["kcoldaed", "deadlock", "kcolDaed", "error"], answer: 0 },
  { tier: 2, type: "fix", title: "MICRO-FIX", prompt: "Return the LAST element of nums. Type the fixed return line.",
    code: "def last(nums):\n    return nums[len(nums)]", bad: 1, answers: ["return nums[-1]", "return nums[len(nums)-1]"] },
  { tier: 2, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "a = [1, 2, 3]\nb = a\nb.append(4)\nprint(len(a))", choices: ["3", "4", "1", "error"], answer: 1 },
  { tier: 2, type: "fix", title: "MICRO-FIX", prompt: "Count the vowels. Type the fixed condition line.",
    code: "count = 0\nfor ch in word:\n    if ch in 'aeiou'\n        count += 1", bad: 2, answers: ["if ch in 'aeiou':", 'if ch in "aeiou":'] },
  { tier: 2, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "print(' '.join(['NULL', 'PTR']).lower())", choices: ["nullptr", "null ptr", "NULL PTR", "null,ptr"], answer: 1 },
  { tier: 2, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "print([x * x for x in range(4)])", choices: ["[1, 4, 9, 16]", "[0, 1, 4, 9]", "[0, 1, 2, 3]", "[0, 2, 4, 6]"], answer: 1 },
  { tier: 2, type: "fix", title: "MICRO-FIX", prompt: "Slice the first 3 characters of code. Type the fixed line.",
    code: "prefix = code[1:3]", bad: 0, answers: ["prefix = code[:3]", "prefix = code[0:3]"] },

  // ---------- Tier 3: stacks, queues, binary search ----------
  { tier: 3, type: "fix", title: "MICRO-FIX", prompt: "Binary search midpoint. Type the safe formula line.",
    code: "while lo <= hi:\n    mid = (lo + hi) / 2", bad: 1, answers: ["mid = lo + (hi - lo) // 2", "mid = (lo + hi) // 2"] },
  { tier: 3, type: "mc", title: "STACK TRACE", prompt: "What does this print?",
    code: "s = []\ns.append(1); s.append(2); s.append(3)\ns.pop()\ns.append(9)\nprint(s[-1], len(s))", choices: ["9 3", "3 3", "9 4", "2 2"], answer: 0 },
  { tier: 3, type: "mc", title: "QUEUE TRACE", prompt: "What does this print?",
    code: "from collections import deque\nq = deque([5, 6])\nq.append(7)\nq.popleft()\nprint(q[0])", choices: ["5", "6", "7", "error"], answer: 1 },
  { tier: 3, type: "fix", title: "MICRO-FIX", prompt: "Infinite loop in binary search. Type the fixed line.",
    code: "if arr[mid] < target:\n    lo = mid", bad: 1, answers: ["lo = mid + 1", "lo = mid+1"] },
  { tier: 3, type: "mc", title: "LOGIC CHECK", prompt: "Balanced brackets check uses which structure?",
    code: "is_balanced('([]{})')", choices: ["queue", "stack", "heap", "set"], answer: 1 },
  { tier: 3, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "import bisect\nprint(bisect.bisect_left([1, 3, 3, 7], 3))", choices: ["0", "1", "2", "3"], answer: 1 },
  { tier: 3, type: "fix", title: "MICRO-FIX", prompt: "Peek the top of the stack without removing it. Type the fixed line.",
    code: "top = stack.pop()", bad: 0, answers: ["top = stack[-1]"] },

  // ---------- Tier 4: recursion & complexity ----------
  { tier: 4, type: "fix", title: "RECURSION FIX", prompt: "Missing base case → RecursionError. Type the base case line.",
    code: "def fact(n):\n    # base case missing\n    return n * fact(n - 1)", bad: 1, answers: ["if n <= 1: return 1", "if n<=1:return 1", "if n == 0: return 1", "if n <= 0: return 1", "if n < 2: return 1"] },
  { tier: 4, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "def f(n):\n    return n if n < 2 else f(n-1) + f(n-2)\nprint(f(7))", choices: ["8", "13", "21", "7"], answer: 1 },
  { tier: 4, type: "mc", title: "COMPLEXITY", prompt: "Time complexity of binary search?", code: "binary_search(sorted_arr, target)",
    choices: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], answer: 1 },
  { tier: 4, type: "mc", title: "COMPLEXITY", prompt: "Time complexity of this?", code: "for i in range(n):\n    for j in range(i, n):\n        check(i, j)",
    choices: ["O(n)", "O(n log n)", "O(n^2)", "O(2^n)"], answer: 2 },
  { tier: 4, type: "mc", title: "OUTPUT PREDICTOR", prompt: "What does this print?",
    code: "def s(n):\n    return 0 if n == 0 else n % 10 + s(n // 10)\nprint(s(4096))", choices: ["19", "4096", "10", "15"], answer: 0 },
  { tier: 4, type: "fix", title: "RECURSION FIX", prompt: "Sum of a list, recursively. Type the fixed return line.",
    code: "def total(xs):\n    if not xs: return 0\n    return xs[0] + total(xs)", bad: 2, answers: ["return xs[0] + total(xs[1:])"] },
  { tier: 4, type: "mc", title: "COMPLEXITY", prompt: "Naive recursive fibonacci f(n) runs in roughly…", code: "f(n) = f(n-1) + f(n-2)",
    choices: ["O(n)", "O(n^2)", "O(2^n)", "O(log n)"], answer: 2 },

  // ---------- Tier 5: DP & graphs ----------
  { tier: 5, type: "mc", title: "DP TRACE", prompt: "dp counts ways to climb n stairs (1 or 2 steps). What does this print?",
    code: "dp = [1, 1]\nfor i in range(2, 6):\n    dp.append(dp[i-1] + dp[i-2])\nprint(dp[5])", choices: ["5", "8", "13", "6"], answer: 1 },
  { tier: 5, type: "fix", title: "DP FIX", prompt: "Coin change: fix the transition line (min coins).",
    code: "for c in coins:\n    for a in range(c, amt + 1):\n        dp[a] = max(dp[a], dp[a - c] + 1)", bad: 2, answers: ["dp[a] = min(dp[a], dp[a - c] + 1)", "dp[a] = min(dp[a], dp[a-c]+1)"] },
  { tier: 5, type: "mc", title: "GRAPH TRACE", prompt: "BFS order from A (neighbours visited alphabetically)?",
    code: "A: B, C\nB: D\nC: D, E\nD: -\nE: -", choices: ["A B D C E", "A B C D E", "A C E B D", "A B C E D"], answer: 1 },
  { tier: 5, type: "mc", title: "GRAPH", prompt: "Shortest path in an unweighted graph: best choice?", code: "maze = grid_of_cabins()",
    choices: ["DFS", "BFS", "Dijkstra with negative edges", "sorting"], answer: 1 },
  { tier: 5, type: "fix", title: "GRAPH FIX", prompt: "DFS loops forever on cycles. Type the missing guard line.",
    code: "def dfs(u):\n    # guard missing\n    seen.add(u)\n    for v in g[u]: dfs(v)", bad: 1, answers: ["if u in seen: return", "if u in seen:return"] },
  { tier: 5, type: "mc", title: "DP TRACE", prompt: "Longest common subsequence length of 'LAB' and 'SLAB'?", code: "lcs('LAB', 'SLAB')",
    choices: ["2", "3", "4", "1"], answer: 1 },
  { tier: 5, type: "mc", title: "COMPLEXITY", prompt: "0/1 knapsack DP with n items, capacity W runs in…", code: "dp[i][w] = max(dp[i-1][w], v[i] + dp[i-1][w-wt[i]])",
    choices: ["O(n)", "O(nW)", "O(2^n)", "O(W)"], answer: 1 },
];

const Puzzles = {
  pick(night, lastId) {
    const maxTier = night, minTier = Math.max(1, night - 1);
    let pool = PUZZLES.map((p, i) => ({ ...p, id: i })).filter((p) => p.tier <= maxTier && p.tier >= minTier && p.id !== lastId);
    if (!pool.length) pool = PUZZLES.map((p, i) => ({ ...p, id: i }));
    return pool[Math.floor(Math.random() * pool.length)];
  },
  check(p, given) {
    if (p.type === "mc") return given === p.answer;
    const norm = (s) => String(s).replace(/\s+/g, "").replace(/"/g, "'");
    return p.answers.some((a) => norm(a) === norm(given));
  },
};
