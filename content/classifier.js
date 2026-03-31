// ============================================================
// FOCUS - Content Classifier (YouTube)
// Keyword-based classification: study | neutral | distraction
// ============================================================

const STUDY_KEYWORDS = [
  // Programming & CS
  'tutorial', 'course', 'lecture', 'lesson', 'learn', 'study',
  'programming', 'coding', 'development', 'javascript', 'python',
  'nodejs', 'node.js', 'react', 'angular', 'vue', 'typescript',
  'algorithm', 'data structure', 'dsa', 'leetcode', 'competitive',
  'machine learning', 'deep learning', 'ai', 'artificial intelligence',
  'interview', 'system design', 'database', 'sql', 'api',
  'html', 'css', 'web dev', 'backend', 'frontend', 'full stack',
  'docker', 'kubernetes', 'devops', 'cloud', 'aws', 'git',
  // Academics & Science
  'math', 'physics', 'chemistry', 'biology', 'calculus', 'algebra',
  'exam', 'university', 'college', 'school', 'professor', 'class',
  'explanation', 'explained', 'how to', 'guide', 'documentation',
  'research', 'science', 'engineering', 'medicine', 'history',
  // Finance & Growth
  'productivity', 'habit', 'mindset', 'motivation', 'business',
  'finance', 'investing', 'economics', 'strategy',
  // Languages
  'english', 'language', 'grammar', 'vocabulary', 'speaking',
];

const DISTRACTION_KEYWORDS = [
  // Entertainment
  'funny', 'comedy', 'meme', 'roast', 'prank', 'challenge',
  'reaction', 'react to', 'cringe', 'troll', 'fail', 'fails',
  'try not to laugh', 'satisfying', 'oddly', 'compilation',
  'vlogs', 'vlog', 'daily life', 'routine', 'grwm',
  // Music & Movies
  'official video', 'music video', 'mv', 'lyric video',
  'full movie', 'movie clip', 'film', 'trailer', 'short film',
  'song', 'rap', 'hip hop', 'pop', 'album', 'playlist',
  // Gaming
  'gameplay', 'gaming', 'playthrough', 'walkthrough game',
  'minecraft', 'fortnite', 'roblox', 'gta', 'pubg', 'valorant',
  'stream highlights', 'ranked', 'clutch', 'funny moments gaming',
  // Social / Pop culture
  'celebrity', 'gossip', 'drama', 'beef', 'exposed', 'cancelled',
  'reels', 'shorts', 'tiktok', 'trending', 'viral',
  'unboxing', 'haul', 'review', 'asmr', 'mukbang',
];

/**
 * Classify a piece of text as 'study', 'distraction', or 'neutral'
 * @param {string} text
 * @returns {'study'|'distraction'|'neutral'}
 */
function classifyText(text) {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();

  let studyScore = 0;
  let distractionScore = 0;

  for (const kw of STUDY_KEYWORDS) {
    if (lower.includes(kw)) studyScore++;
  }
  for (const kw of DISTRACTION_KEYWORDS) {
    if (lower.includes(kw)) distractionScore++;
  }

  if (studyScore === 0 && distractionScore === 0) return 'neutral';
  if (studyScore > distractionScore) return 'study';
  if (distractionScore > studyScore) return 'distraction';
  return 'neutral';
}

// Export for use as module or attach to window
if (typeof window !== 'undefined') {
  window.FocusClassifier = { classifyText };
}
