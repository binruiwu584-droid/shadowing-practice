export type Language = 'en' | 'es';

export type Category = 'Travel' | 'Business' | 'Daily Life' | 'Movies' | 'IELTS' | 'DELE';

export type Sentence = {
  id: string;
  language: Language;
  category: Category;
  text: string;
  translation?: string;
};

export type Settings = {
  darkMode: boolean;
  language: Language;
  defaultSpeed: number;
  fontSize: 'sm' | 'md' | 'lg';
};

export type Stats = {
  streakDays: number;
  todayPracticeCount: number;
  totalRecordings: number;
  totalPracticeSeconds: number;
  lastPracticeDate: string;
};
