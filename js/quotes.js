'use strict';

window.QuotesModule = (() => {
  const QUOTES = [
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
    { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
    { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "You'll never change your life until you change something you do daily.", author: "John C. Maxwell" },
    { text: "A habit cannot be tossed out the window; it must be coaxed down the stairs a step at a time.", author: "Mark Twain" },
    { text: "The difference between who you are and who you want to be is what you do.", author: "Unknown" },
    { text: "First forget inspiration. Habit is more dependable.", author: "Octavia Butler" },
    { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear" },
    { text: "Habits are the compound interest of self-improvement.", author: "James Clear" },
    { text: "Make each day your masterpiece.", author: "John Wooden" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "Your daily choices are building your destiny.", author: "Unknown" },
    { text: "The chains of habit are too weak to be felt until they are too strong to be broken.", author: "Samuel Johnson" },
    { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "You don't rise to the level of your goals, you fall to the level of your systems.", author: "James Clear" },
    { text: "Every day is a chance to be better than yesterday.", author: "Unknown" },
    { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
    { text: "Strive for progress, not perfection.", author: "Unknown" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
    { text: "A little progress each day adds up to big results.", author: "Unknown" },
    { text: "The secret to getting ahead is getting started.", author: "Mark Twain" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { text: "Your life is the product of your daily decisions.", author: "Unknown" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Consistency is more important than perfection.", author: "Unknown" },
    { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
    { text: "The struggle you're in today is developing the strength you need for tomorrow.", author: "Unknown" },
    { text: "Progress, not perfection.", author: "Unknown" },
    { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Excellence is not a destination; it is a continuous journey that never ends.", author: "Brian Tracy" },
    { text: "Champions are made from something deep inside — a desire, a dream, a vision.", author: "Muhammad Ali" },
    { text: "Small habits create remarkable results.", author: "James Clear" },
    { text: "It's not about having time. It's about making time.", author: "Unknown" },
    { text: "Today is another chance to get better.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "You are stronger than you think.", author: "Unknown" },
    { text: "Build a life you're proud of, one habit at a time.", author: "Unknown" },
    { text: "Make yourself proud.", author: "Unknown" },
    { text: "Stay focused and never give up.", author: "Unknown" },
  ];

  function getTodayQuote() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }

  function getRandomQuote() {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }

  return { getTodayQuote, getRandomQuote, QUOTES };
})();
