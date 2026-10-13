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
    enter: 'Enter',
    quiet: 'not started',
    planned: 'being built',
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
    enter: 'ادخل',
    quiet: 'لسه مبدأتش',
    planned: 'قيد البناء',
    stages: ['بذرة', 'نبتة', 'جنينة', 'غابة', 'عالم حي'],
  },
} as const;

export type Words = (typeof words)[Language];
export const wordsFor = (language: Language): Words => words[language];
