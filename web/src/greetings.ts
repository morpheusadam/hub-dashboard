// A fresh, creative one-liner for the home screen on every visit.
// Kept short, calm and professional. {name} is filled in when an owner name is
// configured, otherwise the name-free lines are used.

const LINES: string[] = [
  'Everything in one place. Where to first?',
  'The console is yours.',
  'A quiet place to start the work.',
  'Focus is a choice. Make it now.',
  'Small steps, shipped daily.',
  'Your stack, one keystroke away.',
  'Build something worth deploying.',
  'Clarity first, then speed.',
  'The best time to start was now.',
  'Less noise. More signal.',
  'Open a tab. Change something.',
  'Today is a good day to ship.',
  'Ready when you are.',
  'One dashboard to rule them all.',
  'Momentum beats motivation.',
  'Keep it simple. Keep it moving.',
]

const NAMED: string[] = [
  'Welcome back, {name}.',
  'Good to see you, {name}.',
  "Let's make it count, {name}.",
  'The floor is yours, {name}.',
  'Back at it, {name}?',
]

// Deterministic-per-mount randomness without Math.random surprises in SSR.
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function creativeGreeting(name?: string): string {
  const n = (name || '').trim()
  if (n && Math.random() < 0.5) return pick(NAMED).replace('{name}', n)
  return pick(LINES)
}
