// Hand-written Daily What-If cards. Used whenever the AI is slow or unavailable,
// so the daily habit never breaks. Meters are qualitative only (same rules as the AI).
import type { Meters } from './gemini.ts';

export type CardOption = {
  label: string;
  emoji: string;
  scene: string;
  meters: Meters;
  outcome: string;
};

export type DeckCard = {
  category: string;
  emoji: string;
  question: string;
  a: CardOption;
  b: CardOption;
  pip_says: string;
};

/** "skills:up2 free_time:down" → Meters */
function m(spec: string): Meters {
  const out: Meters = {};
  for (const part of spec.split(' ').filter(Boolean)) {
    const [k, v] = part.split(':');
    (out as Record<string, { level: string; note: string }>)[k] = { level: v, note: '' };
  }
  return out;
}

const o = (label: string, emoji: string, scene: string, meters: string, outcome: string): CardOption => ({
  label,
  emoji,
  scene,
  meters: m(meters),
  outcome,
});

const card = (category: string, emoji: string, question: string, a: CardOption, b: CardOption, pip_says: string): DeckCard => ({
  category,
  emoji,
  question,
  a,
  b,
  pip_says,
});

export const DECK: DeckCard[] = [
  // ── study ──
  card('study', '📚', 'Tonight: study 30 minutes, or watch one more episode?',
    o('Study 30 minutes', '📖', 'study', 'skills:up free_time:down', 'Small sessions add up to big skills.'),
    o('One more episode', '📺', 'balance', 'free_time:up wellbeing:up', 'Rest matters too. Tomorrow is a new chance.'),
    'Tiny choices, repeated, become your future!'),
  card('study', '🧠', 'Learn one new skill deeply, or try many things a little?',
    o('Go deep on one', '🎯', 'study', 'skills:up2 free_time:down', 'You could become the go-to person for it.'),
    o('Try many things', '🌈', 'creative', 'skills:up wellbeing:up', 'You might discover what you truly love.'),
    'Both paths teach you something different.'),
  card('study', '✏️', 'Ask a teacher for help, or figure it out alone?',
    o('Ask for help', '🙋', 'teaching', 'skills:up wellbeing:up', 'You learn faster and make a new connection.'),
    o('Figure it out alone', '🔍', 'study', 'skills:up free_time:down', 'It takes longer, but it sticks with you.'),
    'Asking for help is a superpower, not a weakness.'),
  card('study', '🌅', 'Wake up an hour earlier to learn, or sleep in?',
    o('Wake up early', '⏰', 'study', 'skills:up free_time:same wellbeing:down', 'Quiet mornings could become your secret weapon.'),
    o('Sleep in', '😴', 'balance', 'wellbeing:up', 'Good sleep keeps your mind sharp all day.'),
    'Your best hours are the ones you protect.'),
  card('study', '🎓', 'Take a free online course this month, or a paid one?',
    o('Free course', '🆓', 'study', 'skills:up money:same', 'You learn the basics without spending anything.'),
    o('Paid course', '💳', 'study', 'skills:up2 money:down', 'Paying might make you take it more seriously.'),
    'The best course is the one you actually finish!'),
  card('study', '👥', 'Study with friends, or study alone?',
    o('With friends', '🧑‍🤝‍🧑', 'teaching', 'skills:up wellbeing:up2', 'More fun, and you can teach each other.'),
    o('Alone', '🎧', 'study', 'skills:up2 wellbeing:same', 'Fewer distractions, deeper focus.'),
    'Try both and notice which one works for you.'),

  // ── career ──
  card('career', '💼', 'Take a safe job offer, or wait for your dream role?',
    o('Take the safe job', '🏢', 'office', 'money:up2 work:up wellbeing:same', 'Steady pay gives you room to plan your next step.'),
    o('Wait for the dream', '🌟', 'balance', 'money:down wellbeing:up', 'It is risky, but you stay close to what you love.'),
    'There is no wrong answer, only different stories.'),
  card('career', '🚀', 'Start a small side project, or focus fully on your main work?',
    o('Start a side project', '🛠️', 'startup', 'skills:up2 free_time:down2', 'You might discover a business hiding in your hobby.'),
    o('Focus on main work', '🎯', 'office', 'work:up2 free_time:same', 'Doing one thing really well opens doors too.'),
    'Every big company started as a small idea.'),
  card('career', '🤝', 'Message someone in your dream field, or wait until you are ready?',
    o('Send the message', '✉️', 'office', 'work:up2 wellbeing:up', 'One friendly message could change everything.'),
    o('Wait until ready', '⏳', 'study', 'skills:up work:same', 'You will feel more confident later.'),
    'Psst… nobody ever feels fully ready.'),
  card('career', '🌍', 'Work at a big company, or a tiny startup?',
    o('Big company', '🏙️', 'office', 'money:up work:up free_time:same', 'Clear steps, good training, steady growth.'),
    o('Tiny startup', '🚀', 'startup', 'skills:up2 money:down free_time:down', 'You do many jobs and learn super fast.'),
    'Both can be amazing places to grow.'),
  card('career', '🎤', 'Say yes to giving a short talk, or politely say no?',
    o('Say yes', '🙌', 'teaching', 'skills:up2 wellbeing:down', 'Scary at first, but people will remember you.'),
    o('Say no', '🙂', 'balance', 'wellbeing:up free_time:up', 'You keep your energy for what matters now.'),
    'Growth often lives just outside your comfort zone.'),
  card('career', '🧭', 'Switch to a field you are curious about, or stay where you are good?',
    o('Switch fields', '🔄', 'city_move', 'skills:up2 money:down wellbeing:up', 'You start fresh, with lots to learn.'),
    o('Stay and grow', '🌳', 'office', 'money:up work:up2', 'Your experience keeps paying off.'),
    'Curiosity is a great compass.'),
  card('career', '📝', 'Build a portfolio this month, or keep applying with your resume?',
    o('Build a portfolio', '🗂️', 'creative', 'skills:up work:up2 free_time:down', 'Showing your work speaks louder than telling.'),
    o('Keep applying', '📨', 'office', 'work:up free_time:same', 'More applications mean more chances.'),
    'People love to see what you have made!'),

  // ── money ──
  card('money', '💰', 'Save ₹100 a day, or enjoy it now?',
    o('Save it', '🐷', 'balance', 'money:up2 free_time:same', 'Small savings grow into a safety cushion.'),
    o('Enjoy it now', '🍦', 'balance', 'wellbeing:up money:down', 'Little joys make today brighter.'),
    'Saving even a little builds a strong habit.'),
  card('money', '📱', 'Buy the new phone, or keep yours one more year?',
    o('Buy the new phone', '✨', 'balance', 'wellbeing:up money:down2', 'Shiny and new, but your savings shrink.'),
    o('Keep the old one', '🔋', 'balance', 'money:up wellbeing:same', 'Your future self says thank you!'),
    'Ask yourself: want or need?'),
  card('money', '🍳', 'Cook at home this week, or order food?',
    o('Cook at home', '🥗', 'health', 'money:up wellbeing:up free_time:down', 'Healthier, cheaper, and a new skill.'),
    o('Order food', '🛵', 'balance', 'free_time:up money:down', 'More free time for other things.'),
    'Even cooking twice a week makes a difference.'),
  card('money', '🎁', 'Spend on a gadget, or on an experience with friends?',
    o('A gadget', '🎧', 'balance', 'wellbeing:up money:down', 'Fun to use every day.'),
    o('An experience', '🏞️', 'outdoors', 'wellbeing:up2 money:down', 'Memories often last longer than things.'),
    'What will you remember in five years?'),
  card('money', '📊', 'Learn how money works this month, or leave it for later?',
    o('Learn now', '📘', 'study', 'skills:up money:up', 'Knowing basics early could help for life.'),
    o('Later', '🗓️', 'balance', 'free_time:up', 'You can always start when it feels right.'),
    'Money skills are life skills!'),
  card('money', '🧾', 'Try a freelance gig this weekend, or rest?',
    o('Try a gig', '💻', 'startup', 'money:up skills:up free_time:down', 'Extra money and real-world practice.'),
    o('Rest', '🛋️', 'balance', 'wellbeing:up free_time:up', 'Recharged and ready for Monday.'),
    'Your time is valuable either way.'),

  // ── health ──
  card('health', '🏃', 'Walk 20 minutes today, or skip it?',
    o('Go for a walk', '🚶', 'health', 'wellbeing:up2 free_time:down', 'Fresh air and a clearer mind.'),
    o('Skip it', '🛋️', 'balance', 'free_time:up wellbeing:same', 'Maybe tomorrow is the day.'),
    'Your body is the vehicle for every future you!'),
  card('health', '💧', 'Drink 8 glasses of water today, or whatever you feel like?',
    o('8 glasses', '🥤', 'health', 'wellbeing:up', 'More energy and fewer headaches.'),
    o('Whatever I feel like', '☕', 'balance', 'wellbeing:same', 'Keeping it relaxed.'),
    'Tiny habits, giant results.'),
  card('health', '📵', 'No phone for 1 hour before bed, or scroll as usual?',
    o('Phone-free hour', '🌙', 'balance', 'wellbeing:up2 skills:same', 'Deeper sleep and calmer mornings.'),
    o('Scroll as usual', '📱', 'balance', 'free_time:up wellbeing:down', 'Fun now, maybe tired later.'),
    'Your brain loves a little quiet.'),
  card('health', '🧘', 'Try 5 minutes of breathing, or jump straight into the day?',
    o('5 calm minutes', '🫁', 'health', 'wellbeing:up', 'A calmer start to a busy day.'),
    o('Jump in', '⚡', 'office', 'work:up', 'Get moving and use the morning energy.'),
    'Five minutes can reset your whole day.'),
  card('health', '🏋️', 'Join a gym, or work out at home?',
    o('Join a gym', '🏋️', 'health', 'wellbeing:up2 money:down', 'Great equipment and people to cheer you on.'),
    o('Work out at home', '🏠', 'health', 'wellbeing:up money:same', 'Free and flexible, needs self-motivation.'),
    'The best workout is the one you enjoy.'),
  card('health', '🥗', 'Swap one snack for fruit every day this week?',
    o('Yes, fruit!', '🍎', 'health', 'wellbeing:up money:same', 'Your body will notice the difference.'),
    o('Keep my snacks', '🍪', 'balance', 'wellbeing:same', 'Treats are okay in balance.'),
    'Small swaps beat big diets.'),

  // ── habits ──
  card('habits', '⏰', 'Plan tomorrow tonight, or wing it?',
    o('Plan tonight', '🗒️', 'study', 'work:up wellbeing:up', 'You wake up knowing exactly what to do.'),
    o('Wing it', '🎲', 'balance', 'free_time:up work:same', 'Freedom to follow your mood.'),
    'A 5-minute plan can save an hour.'),
  card('habits', '📖', 'Read 10 pages a day, or read when you feel like it?',
    o('10 pages a day', '📚', 'study', 'skills:up2 free_time:down', 'That could be over 10 books a year!'),
    o('When I feel like it', '☁️', 'balance', 'free_time:up', 'Reading stays fun, never a chore.'),
    'Ten pages takes just 15 minutes.'),
  card('habits', '🎯', 'Do your hardest task first, or start with easy ones?',
    o('Hardest first', '🏔️', 'office', 'work:up2 wellbeing:up', 'The rest of the day feels lighter.'),
    o('Easy ones first', '🧩', 'office', 'work:up wellbeing:up', 'Quick wins build momentum.'),
    'Try it for a week and see what fits you.'),
  card('habits', '📓', 'Write 3 lines in a journal tonight, or skip it?',
    o('Write 3 lines', '✍️', 'creative', 'wellbeing:up skills:up', 'You will see how much you grow over time.'),
    o('Skip it', '😌', 'balance', 'free_time:up', 'Some days are for just resting.'),
    'Future you will love reading this.'),
  card('habits', '🔕', 'Turn off notifications while you work, or keep them on?',
    o('Turn them off', '🔇', 'study', 'work:up2 wellbeing:up', 'Deep focus and faster progress.'),
    o('Keep them on', '🔔', 'office', 'work:same', 'You never miss a message.'),
    'Every ping steals a little focus.'),
  card('habits', '🌱', 'Start one tiny new habit this week, or keep things the same?',
    o('Start a tiny habit', '🌱', 'balance', 'skills:up wellbeing:up', 'Tiny habits grow into big changes.'),
    o('Keep things the same', '🏡', 'balance', 'free_time:same', 'Stability can be good too.'),
    'Think tiny. Like, two-minutes tiny.'),

  // ── social ──
  card('social', '📞', 'Call an old friend today, or send a quick text?',
    o('Call them', '☎️', 'balance', 'wellbeing:up2 free_time:down', 'Voices bring people closer than texts.'),
    o('Send a text', '💬', 'balance', 'wellbeing:up', 'Quick, easy, still shows you care.'),
    'Friendships are like plants, they need water.'),
  card('social', '🎉', 'Go to the event where you know nobody, or stay home?',
    o('Go to the event', '🥳', 'city_move', 'wellbeing:up work:up', 'You might meet someone who changes your path.'),
    o('Stay home', '🏠', 'balance', 'free_time:up wellbeing:same', 'A cozy night to recharge.'),
    'One conversation can open a new door.'),
  card('social', '👨‍👩‍👧', 'Spend Sunday with family, or on your own goals?',
    o('Family day', '❤️', 'balance', 'wellbeing:up2 work:same', 'Time with family is never wasted.'),
    o('My goals', '🎯', 'study', 'skills:up work:up', 'A focused day to push forward.'),
    'Balance is a choice you make each week.'),
  card('social', '🙌', 'Volunteer for a few hours this month, or keep the time for yourself?',
    o('Volunteer', '🤲', 'teaching', 'wellbeing:up2 skills:up free_time:down', 'Helping others feels amazing.'),
    o('Keep my time', '⏳', 'balance', 'free_time:up', 'Rest helps you show up better later.'),
    'Kindness is a great way to grow.'),
  card('social', '🧑‍🏫', 'Find a mentor, or learn everything by yourself?',
    o('Find a mentor', '🧭', 'teaching', 'skills:up2 work:up', 'Someone ahead of you can light the way.'),
    o('Learn alone', '🗺️', 'study', 'skills:up', 'You build strong self-reliance.'),
    'Every expert once had a guide.'),
  card('social', '💌', 'Say thank you to someone who helped you, or let it be?',
    o('Say thank you', '🙏', 'balance', 'wellbeing:up2', 'It will make both of your days.'),
    o('Let it be', '🤐', 'balance', 'wellbeing:same', 'They probably know already.'),
    'Gratitude is free and powerful!'),

  // ── creativity ──
  card('creativity', '🎨', 'Make something just for fun this weekend, or be productive?',
    o('Make something fun', '🖌️', 'creative', 'wellbeing:up2 skills:up', 'Play is where new ideas are born.'),
    o('Be productive', '✅', 'office', 'work:up free_time:down', 'You get ahead on your to-do list.'),
    'Creativity is a muscle. Use it!'),
  card('creativity', '🎸', 'Pick up an instrument, or keep listening to music?',
    o('Learn an instrument', '🎵', 'creative', 'skills:up2 free_time:down', 'Slow at first, magical later.'),
    o('Keep listening', '🎧', 'balance', 'wellbeing:up', 'Music still fills your days with joy.'),
    'Every musician started with one note.'),
  card('creativity', '📹', 'Share your work online, or keep it private for now?',
    o('Share it', '🌐', 'creative', 'work:up2 wellbeing:down', 'People might find and love what you make.'),
    o('Keep it private', '🔒', 'creative', 'wellbeing:up skills:up', 'You create freely, without pressure.'),
    'Your work could inspire someone.'),
  card('creativity', '✍️', 'Write for 15 minutes every day, or only when inspired?',
    o('Every day', '🗓️', 'creative', 'skills:up2 free_time:down', 'Habits beat inspiration.'),
    o('When inspired', '💡', 'creative', 'wellbeing:up', 'Your words stay fresh and joyful.'),
    'Inspiration loves to find you working.'),
  card('creativity', '🧩', 'Join a hackathon or contest, or watch from the side?',
    o('Join it', '🏁', 'startup', 'skills:up2 work:up free_time:down2', 'Intense, fun, and you make new friends.'),
    o('Watch this time', '👀', 'balance', 'free_time:up', 'You learn how it works for next time.'),
    'Even losing teaches you a lot.'),
  card('creativity', '📷', 'Take a photo walk this week, or stay in?',
    o('Photo walk', '📸', 'outdoors', 'wellbeing:up skills:up', 'You start seeing beauty everywhere.'),
    o('Stay in', '🏠', 'balance', 'free_time:up', 'A quiet week at home.'),
    'Look closer, the world is full of stories.'),

  // ── mindset ──
  card('mindset', '🌟', 'Try something you might fail at, or stick with what you know?',
    o('Try and maybe fail', '🎢', 'startup', 'skills:up2 wellbeing:down', 'Failing is how everyone learns fastest.'),
    o('Stick with what I know', '🛡️', 'balance', 'wellbeing:up', 'Confident and steady.'),
    'Brave tries make great stories!'),
  card('mindset', '🗺️', 'Move to a new city for a chance, or stay near home?',
    o('Move to a new city', '🧳', 'city_move', 'work:up2 money:down wellbeing:same', 'New people, new chances, new you.'),
    o('Stay near home', '🏡', 'balance', 'wellbeing:up money:up', 'Family, comfort, and lower costs.'),
    'Home can be a place you build anywhere.'),
  card('mindset', '✈️', 'Take a gap year to explore, or keep going straight on?',
    o('Gap year', '🌏', 'travel', 'wellbeing:up2 skills:up money:down', 'You come back knowing yourself better.'),
    o('Keep going', '🛤️', 'study', 'work:up2 money:up', 'You stay on track with your plan.'),
    'Some lessons are only taught by the road.'),
  card('mindset', '🙅', 'Say no to one thing this week to make space, or say yes to everything?',
    o('Say one no', '✋', 'balance', 'free_time:up2 wellbeing:up', 'More space for what really matters.'),
    o('Yes to everything', '🎪', 'office', 'work:up free_time:down2', 'Busy and full, but maybe tired.'),
    'Every yes is a no to something else.'),
  card('mindset', '🔁', 'Restart a goal you gave up on, or set a brand new one?',
    o('Restart old goal', '🔄', 'study', 'skills:up wellbeing:up', 'You already know where to begin.'),
    o('Set a new goal', '🆕', 'startup', 'skills:up wellbeing:up', 'Fresh excitement and new energy.'),
    'Starting again is still starting!'),
  card('mindset', '🏔️', 'Pick one big goal for the year, or many small ones?',
    o('One big goal', '🏔️', 'startup', 'work:up2 free_time:down', 'Huge focus, huge possible reward.'),
    o('Many small goals', '🪜', 'balance', 'skills:up wellbeing:up', 'Lots of little wins along the way.'),
    'Big or small, just keep climbing!'),
];

/** Deterministic pick per user + day, avoiding recently used categories. */
export function pickDeckCard(userId: string, day: string, recentCategories: string[], recentQuestions: string[] = []): DeckCard {
  let hash = 0;
  for (const ch of userId + day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const unseen = DECK.filter((c) => !recentQuestions.includes(c.question));
  const fresh = unseen.filter((c) => !recentCategories.includes(c.category));
  const pool = fresh.length ? fresh : unseen.length ? unseen : DECK;
  return pool[hash % pool.length];
}
