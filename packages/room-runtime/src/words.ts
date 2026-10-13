import type { Language } from '@experience/room-spec';

const words = {
  en: {
    add: 'Add',
    remove: 'Remove',
    empty: 'Nothing here yet.',
    newItem: 'New',
    of: 'of',
    done: 'done',
    total: 'total',
    broken: 'This panel failed to show.',
    missing: 'This panel’s component is not installed.',
    stages: ['Seed', 'Sprout', 'Garden', 'Forest', 'Living world'],
  },
  ar: {
    add: 'إضافة',
    remove: 'حذف',
    empty: 'لسه مفيش حاجة هنا.',
    newItem: 'جديد',
    of: 'من',
    done: 'خلصت',
    total: 'الإجمالي',
    broken: 'الجزء ده ماظهرش.',
    missing: 'مكوّن الجزء ده مش متركب.',
    stages: ['بذرة', 'نبتة', 'جنينة', 'غابة', 'عالم حي'],
  },
} as const;

export type Words = (typeof words)[Language];
export const wordsFor = (language: Language): Words => words[language];
