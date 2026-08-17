// Bengali Text-to-Speech & Cooking/Cleaning Instruction Engine

export interface CookingSummary {
  date: string;
  totalMeals: number;
  flatmateMeals: { name: string; quantity: number }[];
  specialRequests: { itemName: string; quantity: number; notes?: string | null }[];
  bengaliText: string;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

const BENGALI_NUMBER_WORDS: Record<number, string> = {
  0: 'শূন্য',
  1: 'এক',
  2: 'দুই',
  3: 'তিন',
  4: 'চার',
  5: 'পাঁচ',
  6: 'ছয়',
  7: 'সাত',
  8: 'আট',
  9: 'নয়',
  10: 'দশ',
  11: 'এগারো',
  12: 'বারো',
  13: 'তেরো',
  14: 'চৌদ্দ',
  15: 'পনেরো'
};

const BENGALI_COUNT_WORDS: Record<number, string> = {
  1: 'একটি',
  2: 'দুইটি',
  3: 'তিনটি',
  4: 'চারটি',
  5: 'পাঁচটি',
  6: 'ছয়টি',
  7: 'সাতটি',
  8: 'আটটি',
  9: 'নয়টি',
  10: 'দশটি'
};

const BENGALI_DAYS: Record<number, string> = {
  0: 'রবিবার',
  1: 'সোমবার',
  2: 'মঙ্গলবার',
  3: 'বুধবার',
  4: 'বৃহস্পতিবার',
  5: 'শুক্রবার',
  6: 'শনিবার'
};

const BENGALI_MONTHS: Record<number, string> = {
  1: 'জানুয়ারি',
  2: 'ফেব্রুয়ারি',
  3: 'মার্চ',
  4: 'এপ্রিল',
  5: 'মে',
  6: 'জুন',
  7: 'জুলাই',
  8: 'আগস্ট',
  9: 'সেপ্টেম্বর',
  10: 'অক্টোবর',
  11: 'নভেম্বর',
  12: 'ডিসেম্বর'
};

export function toBengaliNumeral(num: number): string {
  return num.toString().split('').map(d => BENGALI_DIGITS[parseInt(d, 10)] ?? d).join('');
}

export function toBengaliWord(num: number): string {
  return BENGALI_NUMBER_WORDS[num] || num.toString();
}

export function formatBengaliSpokenDate(dateString: string): string {
  try {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayName = BENGALI_DAYS[d.getDay()] || '';
    const monthName = BENGALI_MONTHS[month] || '';
    const dayBengali = toBengaliNumeral(day);
    return `${dayName}, ${dayBengali}ই ${monthName}`;
  } catch (_) {
    return '';
  }
}

/**
 * Generates natural spoken Bengali cooking and cleaning instructions for Khala.
 */
export function generateBengaliCookingInstruction(
  date: string,
  totalMeals: number,
  flatmateMeals: { name: string; quantity: number }[],
  specialRequests: { itemName: string; quantity: number; notes?: string | null }[]
): string {
  const parts: string[] = [];

  const spokenDate = formatBengaliSpokenDate(date);
  const dateGreeting = spokenDate ? `আজকে ${spokenDate}।` : 'আজকে';

  // 1. Greeting & Date Opening
  if (totalMeals === 0) {
    parts.push(`আসসালামু আলাইকুম খালা। ${dateGreeting} আজকে কোনো মিল রান্না করার প্রয়োজন নেই।`);
  } else {
    const mealCountWord = `${toBengaliNumeral(totalMeals)}টি`;
    parts.push(`আসসালামু আলাইকুম খালা। ${dateGreeting} আজকে মোট ${mealCountWord} মিল রান্না করতে হবে।`);
  }

  // 2. Who eats breakdown (Explicit, unambiguous Bengali)
  const eating = flatmateMeals.filter(f => f.quantity > 0);
  const notEating = flatmateMeals.filter(f => f.quantity === 0);

  if (eating.length > 0 && totalMeals > 0) {
    const firstQty = eating[0].quantity;
    const allSameQty = eating.every(f => f.quantity === firstQty);

    if (allSameQty && eating.length === 3) {
      if (firstQty === 1) {
        parts.push('সিয়াম, রাইয়ান এবং জুবায়ের সবাই ১টি করে মিল খাবেন।');
      } else {
        parts.push(`সিয়াম, রাইয়ান এবং জুবায়ের সবাই ${toBengaliNumeral(firstQty)}টি করে মিল খাবেন।`);
      }
    } else {
      // Distinct quantities: state each person explicitly so there is zero confusion
      const personPhrases = eating.map(f => {
        let bName = f.name;
        if (f.name.toLowerCase().includes('siam')) bName = 'সিয়াম';
        else if (f.name.toLowerCase().includes('raian') || f.name.toLowerCase().includes('raiyan')) bName = 'রাইয়ান';
        else if (f.name.toLowerCase().includes('jubayer')) bName = 'জুবায়ের';
        return `${bName} ${toBengaliNumeral(f.quantity)}টি মিল`;
      });

      let eatingSentence = '';
      if (personPhrases.length === 1) {
        eatingSentence = `${personPhrases[0]} খাবেন।`;
      } else if (personPhrases.length === 2) {
        eatingSentence = `${personPhrases[0]} এবং ${personPhrases[1]} খাবেন।`;
      } else {
        const last = personPhrases.pop();
        eatingSentence = `${personPhrases.join(', ')} এবং ${last} খাবেন।`;
      }

      if (notEating.length > 0) {
        const notEatingNames = notEating.map(f => {
          if (f.name.toLowerCase().includes('siam')) return 'সিয়াম';
          if (f.name.toLowerCase().includes('raian') || f.name.toLowerCase().includes('raiyan')) return 'রাইয়ান';
          return 'জুবায়ের';
        });
        eatingSentence += ` ${notEatingNames.join(' এবং ')} আজকে কোনো মিল খাবেন না।`;
      }

      parts.push(eatingSentence);
    }
  }

  // 3. Separate Dish requests vs Room Cleaning requests
  const dishPhrases: string[] = [];
  const cleaningNames: string[] = [];

  if (specialRequests && specialRequests.length > 0) {
    for (const req of specialRequests) {
      const itemLower = req.itemName.toLowerCase();

      // Check if it's a room cleaning request
      if (itemLower.includes('clean') || itemLower.includes('পরিষ্কার')) {
        if (itemLower.includes('raiyan') || itemLower.includes('রাইয়ান')) {
          if (!cleaningNames.includes('রাইয়ান')) cleaningNames.push('রাইয়ান');
        } else if (itemLower.includes('siam') || itemLower.includes('সিয়াম')) {
          if (!cleaningNames.includes('সিয়াম')) cleaningNames.push('সিয়াম');
        } else if (itemLower.includes('jubayer') || itemLower.includes('জুবায়ের')) {
          if (!cleaningNames.includes('জুবায়ের')) cleaningNames.push('জুবায়ের');
        } else if (itemLower.includes('living') || itemLower.includes('ড্রয়িং')) {
          if (!cleaningNames.includes('ড্রয়িং রুম')) cleaningNames.push('ড্রয়িং রুম');
        } else if (itemLower.includes('kitchen') || itemLower.includes('রান্নাঘর')) {
          if (!cleaningNames.includes('রান্নাঘর')) cleaningNames.push('রান্নাঘর');
        }
      } else {
        // Dish / Cooking request
        if (itemLower.includes('letka') || itemLower.includes('লেটকা')) {
          dishPhrases.push('লেটকা খিচুড়ি রান্না করবেন');
        } else if (itemLower.includes('sobji_khichuri') || itemLower.includes('সবজি খিচুড়ি')) {
          dishPhrases.push('সবজি খিচুড়ি রান্না করবেন');
        } else if (itemLower.includes('khichuri') || itemLower.includes('খিচুড়ি')) {
          dishPhrases.push('খিচুড়ি রান্না করবেন');
        } else if (itemLower.includes('egg') || itemLower.includes('ডিম')) {
          dishPhrases.push('ডিম ভুনা করবেন');
        } else if (itemLower.includes('alu') || itemLower.includes('আলু ভাজি')) {
          dishPhrases.push('আলু ভাজি করবেন');
        } else if (itemLower.includes('বেশি আলু') || itemLower.includes('তর্কারি')) {
          dishPhrases.push('তরকারিতে একটু বেশি আলু দিবেন');
        } else if (itemLower.includes('ভাত') || itemLower.includes('rice')) {
          dishPhrases.push('ভাত একটু বেশি রান্না করবেন');
        } else if (itemLower.includes('dal') || itemLower.includes('ডাল')) {
          dishPhrases.push('ডাল রান্না করবেন');
        } else if (itemLower.includes('chicken') || itemLower.includes('মুরগি')) {
          dishPhrases.push('মুরগির মাংস রান্না করবেন');
        } else if (itemLower.includes('fish') || itemLower.includes('মাছ')) {
          dishPhrases.push('মাছ রান্না করবেন');
        } else if (itemLower.includes('veg') || itemLower.includes('সবজি')) {
          dishPhrases.push('সবজি বা ভাজি রান্না করবেন');
        } else if (itemLower.includes('less oil') || itemLower.includes('তেল কম')) {
          dishPhrases.push('রান্নায় তেল কম দিবেন');
        } else if (itemLower.includes('spicy') || itemLower.includes('ঝাল')) {
          dishPhrases.push('একটু ঝাল করে রান্না করবেন');
        } else {
          dishPhrases.push(`${req.itemName} করবেন`);
        }
      }
    }
  }

  if (dishPhrases.length > 0) {
    parts.push(`রান্নার নির্দেশ: ${dishPhrases.join(', ')}।`);
  }

  if (cleaningNames.length > 0) {
    if (cleaningNames.length === 1) {
      parts.push(`পরিষ্কারের কাজ: ${cleaningNames[0]}ের রুম পরিষ্কার করবেন।`);
    } else {
      parts.push(`পরিষ্কারের কাজ: ${cleaningNames.join(' এবং ')}ের রুম পরিষ্কার করবেন।`);
    }
  }

  parts.push('ধন্যবাদ খালা।');
  return parts.join(' ');
}
